import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  cancelMerchantStayReservationAPI,
  checkOutMerchantStayOrderAPI,
  confirmMerchantStayCheckInAPI,
  createMerchantStayReservationAPI,
  createMerchantStayWalkInAPI,
  extendMerchantStayOrderAPI,
  getMerchantCheckInMetaAPI,
  getMerchantStayOrderDetailAPI,
  getMerchantStayOrdersAPI,
  getRequestErrorMessage,
} from '../../../utils/request';
import './index.scss';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const initialStayValues = {
  primaryGuest: { name: '', idNo: '', phone: '', gender: 'male' },
  guestCount: 1,
  companions: [],
  paymentMethod: 'cash',
  deposit: 0,
  settlementPaid: 0,
};
const initialQuery = { status: 'all', dateRange: [] };
const paymentOptions = [
  { label: '现金', value: 'cash' },
  { label: '微信', value: 'wechat' },
  { label: '支付宝', value: 'alipay' },
  { label: '银行卡', value: 'bank_card' },
  { label: '其他', value: 'other' },
];
const statusOptions = [
  { label: '全部', value: 'all' },
  { label: '已预订', value: 'reserved' },
  { label: '在住', value: 'checked_in' },
  { label: '已退房', value: 'checked_out' },
  { label: '已取消', value: 'cancelled' },
];

const toDateText = (value) => {
  if (!value) return '';
  if (typeof value?.format === 'function') return value.format('YYYY-MM-DD');
  if (typeof value === 'string') return value.slice(0, 10);
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
};
const yuanToCents = (value) => Math.max(0, Math.round(Number(value || 0) * 100));
const centsToYuan = (value) => ((Number(value) || 0) / 100).toFixed(2);
const statusTag = (status) => {
  const map = {
    reserved: { text: '已预订', color: 'blue' },
    checked_in: { text: '在住', color: 'green' },
    checked_out: { text: '已退房', color: 'default' },
    cancelled: { text: '已取消', color: 'orange' },
  };
  const meta = map[status] || { text: '--', color: 'default' };
  return <Tag color={meta.color}>{meta.text}</Tag>;
};

export default function CheckIn() {
  const [stayForm] = Form.useForm();
  const [extendForm] = Form.useForm();
  const [checkOutForm] = Form.useForm();
  const [queryForm] = Form.useForm();

  const [stayMode, setStayMode] = useState('walk_in');
  const [metaData, setMetaData] = useState({
    canManageCheckIn: false,
    blockReason: '',
    rooms: [],
    reservedOrders: [],
    checkedInOrders: [],
  });
  const [metaLoaded, setMetaLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [reservedOrderId, setReservedOrderId] = useState();
  const [queryState, setQueryState] = useState(initialQuery);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [orderList, setOrderList] = useState([]);
  const [detail, setDetail] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const initializedRef = useRef(false);

  const selectedRoomId = Form.useWatch('roomId', stayForm);
  const guestCount = Form.useWatch('guestCount', stayForm) || 1;
  const roomMap = useMemo(() => new Map((metaData.rooms || []).map((r) => [Number(r.id), r])), [metaData.rooms]);
  const selectedRoom = roomMap.get(Number(selectedRoomId));
  const guestMax = Math.min(4, Number(selectedRoom?.maxGuests || 4));

  const loadMeta = useCallback(async () => {
    const res = await getMerchantCheckInMetaAPI();
    setMetaData(res.data || {});
    setMetaLoaded(true);
  }, []);

  const loadOrders = useCallback(async ({
    nextPage = page,
    nextPageSize = pageSize,
    nextQuery = queryState,
  } = {}) => {
    setTableLoading(true);
    try {
      const range = nextQuery.dateRange || [];
      const res = await getMerchantStayOrdersAPI({
        page: nextPage,
        pageSize: nextPageSize,
        orderNo: nextQuery.orderNo || undefined,
        roomNumber: nextQuery.roomNumber || undefined,
        primaryGuestName: nextQuery.primaryGuestName || undefined,
        status: nextQuery.status === 'all' ? undefined : nextQuery.status,
        startDate: toDateText(range[0]) || undefined,
        endDate: toDateText(range[1]) || undefined,
      });
      const data = res.data || {};
      setOrderList(data.list || []);
      setTotal(Number(data.pagination?.total || 0));
      setPage(nextPage);
      setPageSize(nextPageSize);
    } catch (error) {
      message.error(getRequestErrorMessage(error, '加载入住记录失败'));
    } finally {
      setTableLoading(false);
    }
  }, [page, pageSize, queryState]);

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }
    initializedRef.current = true;
    stayForm.setFieldsValue(initialStayValues);
    queryForm.setFieldsValue(initialQuery);
    (async () => {
      try {
        setLoading(true);
        await Promise.all([loadMeta(), loadOrders({ nextPage: 1, nextPageSize: 10, nextQuery: initialQuery })]);
      } catch (error) {
        setMetaLoaded(true);
        message.error(getRequestErrorMessage(error, '入住模块初始化失败'));
      } finally {
        setLoading(false);
      }
    })();
  }, [loadMeta, loadOrders, queryForm, stayForm]);

  useEffect(() => {
    if (guestCount > guestMax) {
      stayForm.setFieldValue('guestCount', guestMax);
      return;
    }
    const target = Math.max(0, guestCount - 1);
    const current = stayForm.getFieldValue('companions') || [];
    if (current.length !== target) {
      stayForm.setFieldValue('companions', Array.from({ length: target }, (_, i) => current[i] || {}));
    }
  }, [guestCount, guestMax, stayForm]);

  const roomOptions = useMemo(() => (metaData.rooms || [])
    .filter((room) => room.physicalStatus === 'vacant_clean')
    .map((room) => ({
      label: `${room.roomNumber} | ${room.roomTypeName} | ${room.salesStatus === 'available' ? '可售' : '不可售'}`,
      value: room.id,
      disabled: room.salesStatus !== 'available',
    })), [metaData.rooms]);

  const checkedInOptions = useMemo(() => (metaData.checkedInOrders || []).map((order) => ({
    label: `${order.roomNumber} | ${order.orderNo} | ${order.primaryGuestName}`,
    value: order.id,
  })), [metaData.checkedInOrders]);
  const reservedOptions = useMemo(() => (metaData.reservedOrders || []).map((order) => ({
    label: `${order.roomNumber} | ${order.orderNo} | ${order.primaryGuestName}`,
    value: order.id,
  })), [metaData.reservedOrders]);

  const submitStay = async () => {
    try {
      const values = await stayForm.validateFields();
      setLoading(true);
      const payload = {
        roomId: values.roomId,
        guestCount: values.guestCount,
        primaryGuest: values.primaryGuest,
        companions: (values.companions || []).slice(0, Math.max(0, values.guestCount - 1)),
        checkInDate: toDateText(values.checkInDate),
        checkOutDate: toDateText(values.checkOutDate),
        nightlyPriceCents: yuanToCents(values.nightlyPrice),
        depositCents: yuanToCents(values.deposit),
        settlementPaidCents: yuanToCents(values.settlementPaid),
        paymentMethod: values.paymentMethod,
        remark: values.remark || '',
      };
      if (stayMode === 'reservation') {
        const res = await createMerchantStayReservationAPI(payload);
        setReservedOrderId(res.data?.id);
        message.success('预订创建成功');
      } else {
        await createMerchantStayWalkInAPI(payload);
        message.success('入住办理成功');
      }
      stayForm.resetFields();
      stayForm.setFieldsValue(initialStayValues);
      await Promise.all([loadMeta(), loadOrders({})]);
    } catch (error) {
      if (!error?.errorFields) {
        message.error(getRequestErrorMessage(error, '保存失败'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReservation = async () => {
    if (!reservedOrderId) return message.warning('请选择一个预订单');
    try {
      setLoading(true);
      await confirmMerchantStayCheckInAPI(reservedOrderId, {});
      setReservedOrderId(undefined);
      message.success('确认入住成功');
      await Promise.all([loadMeta(), loadOrders({})]);
    } catch (error) {
      message.error(getRequestErrorMessage(error, '确认入住失败'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancelReservation = async () => {
    if (!reservedOrderId) return message.warning('请选择一个预订单');
    try {
      setLoading(true);
      await cancelMerchantStayReservationAPI(reservedOrderId, {});
      setReservedOrderId(undefined);
      message.success('取消预订成功');
      await Promise.all([loadMeta(), loadOrders({})]);
    } catch (error) {
      message.error(getRequestErrorMessage(error, '取消预订失败'));
    } finally {
      setLoading(false);
    }
  };

  const handleExtend = async () => {
    try {
      const values = await extendForm.validateFields();
      setLoading(true);
      await extendMerchantStayOrderAPI(values.orderId, {
        newCheckOutDate: toDateText(values.newCheckOutDate),
        remark: values.remark || '',
      });
      extendForm.resetFields();
      message.success('续住办理成功');
      await Promise.all([loadMeta(), loadOrders({})]);
    } catch (error) {
      if (!error?.errorFields) {
        message.error(getRequestErrorMessage(error, '续住办理失败'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      const values = await checkOutForm.validateFields();
      setLoading(true);
      await checkOutMerchantStayOrderAPI(values.orderId, {
        actualCheckOutDate: toDateText(values.actualCheckOutDate),
        settlementPaidCents: yuanToCents(values.settlementPaid),
        paymentMethod: values.paymentMethod,
        remark: values.remark || '',
      });
      checkOutForm.resetFields();
      message.success('退房结算成功');
      await Promise.all([loadMeta(), loadOrders({})]);
    } catch (error) {
      if (!error?.errorFields) {
        message.error(getRequestErrorMessage(error, '退房结算失败'));
      }
    } finally {
      setLoading(false);
    }
  };

  const queryOrders = async () => {
    const values = queryForm.getFieldsValue();
    const nextQuery = { ...initialQuery, ...values };
    setQueryState(nextQuery);
    await loadOrders({ nextPage: 1, nextPageSize: pageSize, nextQuery });
  };

  const resetQuery = async () => {
    queryForm.setFieldsValue(initialQuery);
    setQueryState(initialQuery);
    await loadOrders({ nextPage: 1, nextPageSize: pageSize, nextQuery: initialQuery });
  };

  const openDetail = async (id) => {
    try {
      setLoading(true);
      const res = await getMerchantStayOrderDetailAPI(id);
      setDetail(res.data || null);
      setDetailOpen(true);
    } catch (error) {
      message.error(getRequestErrorMessage(error, '获取详情失败'));
    } finally {
      setLoading(false);
    }
  };

  const printOrder = async (id) => {
    try {
      setLoading(true);
      const res = await getMerchantStayOrderDetailAPI(id);
      const info = res.data;
      if (!info) return;
      const w = window.open('', '_blank', 'width=900,height=700');
      if (!w) return message.warning('请允许浏览器弹窗后重试');
      w.document.write(`<html><head><meta charset="utf-8"/><title>${info.orderNo}</title></head><body>
      <h2>入住单 ${info.orderNo}</h2>
      <p>房间：${info.roomNumber}（${info.roomTypeNameSnapshot || '--'}）</p>
      <p>状态：${info.status}</p>
      <p>主入住人：${info.primaryGuestName}</p>
      <p>入住日期：${info.plannedCheckInDate} ~ ${info.plannedCheckOutDate}</p>
      <p>房费总额：¥${centsToYuan(info.roomChargeCents)}</p>
      </body></html>`);
      w.document.close();
      setTimeout(() => w.print(), 200);
    } catch (error) {
      message.error(getRequestErrorMessage(error, '打印失败'));
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: '订单号', dataIndex: 'orderNo', width: 180 },
    { title: '房间号', dataIndex: 'roomNumber', width: 120 },
    { title: '主入住人', dataIndex: 'primaryGuestName', width: 140 },
    { title: '状态', dataIndex: 'status', width: 100, render: statusTag },
    { title: '计划入住', dataIndex: 'plannedCheckInDate', width: 130 },
    { title: '计划离店', dataIndex: 'plannedCheckOutDate', width: 130 },
    { title: '房费', dataIndex: 'roomChargeCents', width: 110, render: (v) => `¥${centsToYuan(v)}` },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => openDetail(record.id)}>详情</Button>
          <Button type="link" onClick={() => printOrder(record.id)}>打印</Button>
        </Space>
      ),
    },
  ];

  const stayTab = (
    <Card bordered={false}>
      <Form form={stayForm} layout="vertical" initialValues={initialStayValues}>
        <div className="check-in-page__section">办理模式</div>
        <Radio.Group
          optionType="button"
          buttonStyle="solid"
          value={stayMode}
          onChange={(e) => setStayMode(e.target.value)}
          options={[{ label: '散客入住', value: 'walk_in' }, { label: '预订入住', value: 'reservation' }]}
        />
        <Divider />
        <div className="check-in-page__section">1. 主入住人信息（必填）</div>
        <div className="check-in-page__grid grid-4">
          <Form.Item name={['primaryGuest', 'name']} label="姓名" rules={[{ required: true, message: '请输入姓名' }]}><Input /></Form.Item>
          <Form.Item name={['primaryGuest', 'idNo']} label="身份证号" rules={[{ required: true, message: '请输入身份证号' }]}><Input /></Form.Item>
          <Form.Item name={['primaryGuest', 'phone']} label="手机号" rules={[{ required: true, message: '请输入手机号' }]}><Input /></Form.Item>
          <Form.Item name={['primaryGuest', 'gender']} label="性别" rules={[{ required: true, message: '请选择性别' }]}><Radio.Group><Radio value="male">男</Radio><Radio value="female">女</Radio></Radio.Group></Form.Item>
        </div>
        <div className="check-in-page__section">2. 入住人数</div>
        <Form.Item name="guestCount" label="入住人数" extra={`最多 ${guestMax} 人`} rules={[{ required: true, message: '请选择入住人数' }]}>
          <Select style={{ width: 220 }} options={Array.from({ length: guestMax }, (_, i) => ({ label: `${i + 1}`, value: i + 1 }))} />
        </Form.Item>
        {guestCount > 1 ? (
          <>
            <div className="check-in-page__section">3. 同行人信息（动态）</div>
            <Form.List name="companions">
              {(fields) => fields.map((field, index) => (
                <div className="check-in-page__grid grid-2" key={field.key}>
                  <Form.Item label={`同行人${index + 1}姓名`} name={[field.name, 'name']} rules={[{ required: true, message: '请输入姓名' }]}><Input /></Form.Item>
                  <Form.Item label={`同行人${index + 1}身份证号`} name={[field.name, 'idNo']} rules={[{ required: true, message: '请输入身份证号' }]}><Input /></Form.Item>
                </div>
              ))}
            </Form.List>
          </>
        ) : null}
        <div className="check-in-page__section">4. 入住信息</div>
        <div className="check-in-page__grid grid-3">
          <Form.Item name="roomId" label="房间" rules={[{ required: true, message: '请选择房间' }]}><Select showSearch optionFilterProp="label" options={roomOptions} /></Form.Item>
          <Form.Item name="checkInDate" label="入住日期" rules={[{ required: true, message: '请选择入住日期' }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="checkOutDate" label="离店日期" rules={[{ required: true, message: '请选择离店日期' }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
        </div>
        <div className="check-in-page__section">5. 费用信息</div>
        <div className="check-in-page__grid grid-4">
          <Form.Item name="nightlyPrice" label="单晚房费" rules={[{ required: true, message: '请输入单晚房费' }]}><InputNumber addonAfter="元" precision={2} min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="deposit" label="押金"><InputNumber addonAfter="元" precision={2} min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="settlementPaid" label="实收"><InputNumber addonAfter="元" precision={2} min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="paymentMethod" label="支付方式"><Select options={paymentOptions} /></Form.Item>
        </div>
        <Form.Item name="remark" label="备注"><Input.TextArea rows={3} maxLength={500} /></Form.Item>
        <Space>
          <Button onClick={() => { stayForm.resetFields(); stayForm.setFieldsValue(initialStayValues); }}>重置</Button>
          <Button type="primary" loading={loading} onClick={submitStay}>保存（预订/入住）</Button>
          <Button disabled={stayMode !== 'reservation'} loading={loading} onClick={handleConfirmReservation}>确认入住</Button>
          <Button disabled={!reservedOrderId} loading={loading} onClick={() => printOrder(reservedOrderId)}>打印单据</Button>
        </Space>
      </Form>
      {stayMode === 'reservation' ? (
        <>
          <Divider />
          <Space wrap>
            <Select style={{ width: 460 }} options={reservedOptions} value={reservedOrderId} onChange={setReservedOrderId} placeholder="选择预订单后可确认入住/取消预订" />
            <Button disabled={!reservedOrderId} onClick={handleConfirmReservation}>确认入住</Button>
            <Button danger disabled={!reservedOrderId} onClick={handleCancelReservation}>取消预订</Button>
          </Space>
        </>
      ) : null}
    </Card>
  );

  const extendTab = (
    <Card bordered={false}>
      <Form form={extendForm} layout="vertical">
        <div className="check-in-page__grid grid-2">
          <Form.Item name="orderId" label="在住订单" rules={[{ required: true, message: '请选择在住订单' }]}><Select options={checkedInOptions} showSearch optionFilterProp="label" /></Form.Item>
          <Form.Item name="newCheckOutDate" label="新离店日期" rules={[{ required: true, message: '请选择新离店日期' }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
        </div>
        <Form.Item name="remark" label="备注"><Input.TextArea rows={3} maxLength={500} /></Form.Item>
        <Space><Button onClick={() => extendForm.resetFields()}>重置</Button><Button type="primary" loading={loading} onClick={handleExtend}>确认续住</Button></Space>
      </Form>
    </Card>
  );

  const checkoutTab = (
    <Card bordered={false}>
      <Form form={checkOutForm} layout="vertical" initialValues={{ paymentMethod: 'cash', settlementPaid: 0 }}>
        <div className="check-in-page__grid grid-2">
          <Form.Item name="orderId" label="在住订单" rules={[{ required: true, message: '请选择在住订单' }]}><Select options={checkedInOptions} showSearch optionFilterProp="label" /></Form.Item>
          <Form.Item name="actualCheckOutDate" label="退房日期"><DatePicker style={{ width: '100%' }} /></Form.Item>
        </div>
        <div className="check-in-page__grid grid-2">
          <Form.Item name="settlementPaid" label="实收金额" rules={[{ required: true, message: '请输入实收金额' }]}><InputNumber addonAfter="元" precision={2} min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="paymentMethod" label="支付方式" rules={[{ required: true, message: '请选择支付方式' }]}><Select options={paymentOptions} /></Form.Item>
        </div>
        <Form.Item name="remark" label="备注"><Input.TextArea rows={3} maxLength={500} /></Form.Item>
        <Space><Button onClick={() => checkOutForm.resetFields()}>重置</Button><Button type="primary" loading={loading} onClick={handleCheckOut}>确认退房</Button></Space>
      </Form>
    </Card>
  );

  const queryTab = (
    <Card bordered={false}>
      <Form form={queryForm} layout="inline" className="check-in-page__query">
        <Form.Item name="orderNo" label="订单号"><Input allowClear /></Form.Item>
        <Form.Item name="roomNumber" label="房间号"><Input allowClear /></Form.Item>
        <Form.Item name="primaryGuestName" label="主入住人"><Input allowClear /></Form.Item>
        <Form.Item name="status" label="状态"><Select options={statusOptions} style={{ width: 140 }} /></Form.Item>
        <Form.Item name="dateRange" label="日期范围"><RangePicker /></Form.Item>
        <Form.Item><Space><Button type="primary" onClick={queryOrders}>查询</Button><Button onClick={resetQuery}>重置</Button></Space></Form.Item>
      </Form>
      <Table
        rowKey="id"
        loading={tableLoading}
        dataSource={orderList}
        columns={columns}
        scroll={{ x: 1100 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (value) => `共 ${value} 条记录`,
          onChange: (nextPage, nextPageSize) => loadOrders({ nextPage, nextPageSize, nextQuery: queryState }),
        }}
        locale={{ emptyText: <Empty description="暂无入住记录" /> }}
      />
    </Card>
  );

  return (
    <div className="page-container check-in-page">
      <Card bordered={false} className="check-in-page__header">
        <Title level={2}>入住登记</Title>
        <Text>入住办理 / 续住办理 / 退房结算 / 入住查询</Text>
      </Card>

      {metaLoaded && !loading && !metaData.canManageCheckIn ? (
        <Alert className="check-in-page__warn" type="warning" showIcon message="当前不可办理入住" description={metaData.blockReason || '请先完成酒店资料审核'} />
      ) : null}

      <Tabs
        items={[
          { key: 'stay', label: '入住办理', children: stayTab },
          { key: 'extend', label: '续住办理', children: extendTab },
          { key: 'checkout', label: '退房结算', children: checkoutTab },
          { key: 'query', label: '入住查询', children: queryTab },
        ]}
      />

      <Modal
        title="入住单详情"
        open={detailOpen}
        onCancel={() => { setDetailOpen(false); setDetail(null); }}
        width={760}
        footer={null}
      >
        {detail ? (
          <>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="订单号">{detail.orderNo}</Descriptions.Item>
              <Descriptions.Item label="状态">{statusTag(detail.status)}</Descriptions.Item>
              <Descriptions.Item label="房间">{detail.roomNumber}</Descriptions.Item>
              <Descriptions.Item label="主入住人">{detail.primaryGuestName}</Descriptions.Item>
              <Descriptions.Item label="入住日期">{detail.plannedCheckInDate}</Descriptions.Item>
              <Descriptions.Item label="离店日期">{detail.plannedCheckOutDate}</Descriptions.Item>
              <Descriptions.Item label="房费总额">¥{centsToYuan(detail.roomChargeCents)}</Descriptions.Item>
              <Descriptions.Item label="差额">¥{centsToYuan(detail.balanceCents)}</Descriptions.Item>
            </Descriptions>
            <Divider>住客信息</Divider>
            <Table
              rowKey="id"
              pagination={false}
              size="small"
              dataSource={detail.guests || []}
              columns={[
                { title: '类型', dataIndex: 'isPrimary', width: 100, render: (v) => (v ? '主入住人' : '同行人') },
                { title: '姓名', dataIndex: 'name' },
                { title: '证件号', dataIndex: 'idNo' },
                { title: '手机号', dataIndex: 'phone', render: (v) => v || '--' },
              ]}
            />
          </>
        ) : <Empty description="暂无详情" />}
      </Modal>
    </div>
  );
}
