const { query, withTransaction } = require('../../../db/index');
const {
  hotelImageGroupLimits,
  hotelImageGroupLabels,
  reviewRequiredImageGroups,
  hotelCertificateGroupLimits,
  hotelCertificateGroupLabels,
  reviewRequiredCertificateGroups,
} = require('./constants');
const {
  mapHotelImage,
  groupHotelImages,
  mapHotelCertificate,
  groupHotelCertificates,
  deleteLocalHotelImageSafely,
  deleteLocalHotelCertificateSafely,
  createHandlerError,
} = require('./helpers');
const {
  runQuery,
  lockMerchantRow,
  getHotelImagesByMerchantId,
  getHotelCertificatesByMerchantId,
} = require('./repository');
const { ensureMerchantHotelEditable } = require('./profile');

const getGroupedHotelImages = async (merchantUserId) => {
  const rows = await getHotelImagesByMerchantId(merchantUserId);
  return groupHotelImages(rows);
};

const uploadHotelImageByMerchantId = async (merchantUserId, imageGroup, file) => {
  const insertedImage = await withTransaction(async (tx) => {
    await lockMerchantRow(tx, merchantUserId);
    const editableResult = await ensureMerchantHotelEditable(merchantUserId, tx);
    if (!editableResult.ok) {
      throw createHandlerError('validation', editableResult.message, editableResult.field);
    }

    const existingCountRows = await runQuery(
      tx,
      'SELECT COUNT(*) AS total FROM merchant_hotel_images WHERE merchant_user_id = ? AND image_group = ? FOR UPDATE',
      [merchantUserId, imageGroup]
    );
    const currentCount = Number(existingCountRows?.[0]?.total || 0);
    const maxCount = hotelImageGroupLimits[imageGroup];
    if (currentCount >= maxCount) {
      throw createHandlerError(
        'validation',
        `${hotelImageGroupLabels[imageGroup]}最多上传 ${maxCount} 张`,
        `hotelImages.${imageGroup}`
      );
    }

    const nextSortRows = await runQuery(
      tx,
      'SELECT COALESCE(MAX(sort_order), 0) + 1 AS nextSort FROM merchant_hotel_images WHERE merchant_user_id = ? AND image_group = ? FOR UPDATE',
      [merchantUserId, imageGroup]
    );
    const nextSort = Number(nextSortRows?.[0]?.nextSort || 1);
    const filePath = `/uploads/hotel-images/${file.filename}`;

    const insertResult = await runQuery(
      tx,
      'INSERT INTO merchant_hotel_images (merchant_user_id, image_group, file_path, file_name, mime_type, size_bytes, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        merchantUserId,
        imageGroup,
        filePath,
        file.originalname || '',
        file.mimetype || '',
        Number(file.size) || 0,
        nextSort,
      ]
    );

    const [row] = await runQuery(
      tx,
      'SELECT * FROM merchant_hotel_images WHERE id = ? LIMIT 1',
      [insertResult.insertId]
    );
    return row;
  });

  return mapHotelImage(insertedImage);
};

const deleteHotelImageByMerchantId = async (merchantUserId, imageId) => {
  const targetImage = await withTransaction(async (tx) => {
    await lockMerchantRow(tx, merchantUserId);
    const editableResult = await ensureMerchantHotelEditable(merchantUserId, tx);
    if (!editableResult.ok) {
      throw createHandlerError('validation', editableResult.message, editableResult.field);
    }

    const [row] = await runQuery(
      tx,
      `SELECT * FROM merchant_hotel_images
       WHERE id = ? AND merchant_user_id = ?
       LIMIT 1
       FOR UPDATE`,
      [imageId, merchantUserId]
    );

    if (!row) {
      throw createHandlerError('notFound', '图片不存在或无权限删除', 'id');
    }

    await runQuery(
      tx,
      `DELETE FROM merchant_hotel_images WHERE id = ? AND merchant_user_id = ?`,
      [imageId, merchantUserId]
    );
    return row;
  });

  const fileResult = deleteLocalHotelImageSafely(targetImage.file_path);
  if (!fileResult.ok && !fileResult.missing) {
    console.warn('删除本地酒店图片失败，已删除数据库记录:', {
      imageId,
      merchantUserId,
      filePath: targetImage.file_path,
      reason: fileResult.message,
    });
  }
};

const sortHotelImagesByMerchantId = async (merchantUserId, imageGroup, orderedIds) => {
  const latestRows = await withTransaction(async (tx) => {
    await lockMerchantRow(tx, merchantUserId);
    const editableResult = await ensureMerchantHotelEditable(merchantUserId, tx);
    if (!editableResult.ok) {
      throw createHandlerError('validation', editableResult.message, editableResult.field);
    }

    const rows = await runQuery(
      tx,
      `SELECT * FROM merchant_hotel_images
       WHERE merchant_user_id = ? AND image_group = ?
       ORDER BY sort_order ASC, id ASC
       FOR UPDATE`,
      [merchantUserId, imageGroup]
    );
    const currentIds = rows.map((row) => Number(row.id));
    if (currentIds.length !== orderedIds.length) {
      throw createHandlerError('validation', '排序数量与分组内图片数量不一致', 'orderedIds');
    }

    const idSet = new Set(currentIds);
    const allMatch = orderedIds.every((id) => idSet.has(id));
    if (!allMatch) {
      throw createHandlerError('validation', '排序列表包含无效图片', 'orderedIds');
    }

    const caseSql = orderedIds.map(() => 'WHEN ? THEN ?').join(' ');
    const caseValues = [];
    orderedIds.forEach((id, index) => {
      caseValues.push(id, index + 1);
    });
    const inPlaceholders = orderedIds.map(() => '?').join(', ');

    await runQuery(
      tx,
      `UPDATE merchant_hotel_images
       SET sort_order = CASE id ${caseSql} END
       WHERE merchant_user_id = ? AND image_group = ? AND id IN (${inPlaceholders})`,
      [...caseValues, merchantUserId, imageGroup, ...orderedIds]
    );

    return getHotelImagesByMerchantId(merchantUserId, imageGroup, tx);
  });

  return latestRows.map(mapHotelImage);
};

const getGroupedHotelCertificates = async (merchantUserId) => {
  const rows = await getHotelCertificatesByMerchantId(merchantUserId);
  return groupHotelCertificates(rows);
};

const uploadHotelCertificateByMerchantId = async (merchantUserId, certGroup, file) => {
  const insertedCertificate = await withTransaction(async (tx) => {
    await lockMerchantRow(tx, merchantUserId);
    const editableResult = await ensureMerchantHotelEditable(merchantUserId, tx);
    if (!editableResult.ok) {
      throw createHandlerError('validation', editableResult.message, editableResult.field);
    }

    const existingCountRows = await runQuery(
      tx,
      `SELECT COUNT(*) AS total
       FROM merchant_hotel_certificates
       WHERE merchant_user_id = ? AND cert_group = ?
       FOR UPDATE`,
      [merchantUserId, certGroup]
    );
    const currentCount = Number(existingCountRows?.[0]?.total || 0);
    const maxCount = hotelCertificateGroupLimits[certGroup];
    if (currentCount >= maxCount) {
      throw createHandlerError(
        'validation',
        `${hotelCertificateGroupLabels[certGroup]}最多上传 ${maxCount} 张`,
        `hotelCertificates.${certGroup}`
      );
    }

    const nextSortRows = await runQuery(
      tx,
      `SELECT COALESCE(MAX(sort_order), 0) + 1 AS nextSort
       FROM merchant_hotel_certificates
       WHERE merchant_user_id = ? AND cert_group = ?
       FOR UPDATE`,
      [merchantUserId, certGroup]
    );
    const nextSort = Number(nextSortRows?.[0]?.nextSort || 1);
    const filePath = `/uploads/hotel-certificates/${file.filename}`;

    const insertResult = await runQuery(
      tx,
      `INSERT INTO merchant_hotel_certificates
        (merchant_user_id, cert_group, file_path, file_name, mime_type, size_bytes, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        merchantUserId,
        certGroup,
        filePath,
        file.originalname || '',
        file.mimetype || '',
        Number(file.size) || 0,
        nextSort,
      ]
    );

    const [row] = await runQuery(
      tx,
      `SELECT * FROM merchant_hotel_certificates WHERE id = ? LIMIT 1`,
      [insertResult.insertId]
    );
    return row;
  });

  return mapHotelCertificate(insertedCertificate);
};

const deleteHotelCertificateByMerchantId = async (merchantUserId, certificateId) => {
  const targetCertificate = await withTransaction(async (tx) => {
    await lockMerchantRow(tx, merchantUserId);
    const editableResult = await ensureMerchantHotelEditable(merchantUserId, tx);
    if (!editableResult.ok) {
      throw createHandlerError('validation', editableResult.message, editableResult.field);
    }

    const [row] = await runQuery(
      tx,
      `SELECT * FROM merchant_hotel_certificates
       WHERE id = ? AND merchant_user_id = ?
       LIMIT 1
       FOR UPDATE`,
      [certificateId, merchantUserId]
    );

    if (!row) {
      throw createHandlerError('notFound', '证件不存在或无权限删除', 'id');
    }

    await runQuery(
      tx,
      `DELETE FROM merchant_hotel_certificates WHERE id = ? AND merchant_user_id = ?`,
      [certificateId, merchantUserId]
    );
    return row;
  });

  const fileResult = deleteLocalHotelCertificateSafely(targetCertificate.file_path);
  if (!fileResult.ok && !fileResult.missing) {
    console.warn('删除本地资质证件失败，已删除数据库记录:', {
      certificateId,
      merchantUserId,
      filePath: targetCertificate.file_path,
      reason: fileResult.message,
    });
  }
};

const validateReviewRequiredImages = async (merchantUserId) => {
  const placeholders = reviewRequiredImageGroups.map(() => '?').join(',');
  const rows = await query(
    `SELECT image_group, COUNT(*) AS total
     FROM merchant_hotel_images
     WHERE merchant_user_id = ?
       AND image_group IN (${placeholders})
     GROUP BY image_group`,
    [merchantUserId, ...reviewRequiredImageGroups]
  );

  const counters = rows.reduce((acc, row) => {
    acc[row.image_group] = Number(row.total) || 0;
    return acc;
  }, {});

  for (const groupKey of reviewRequiredImageGroups) {
    if ((counters[groupKey] || 0) < 1) {
      return {
        ok: false,
        field: `hotelImages.${groupKey}`,
        message: `${hotelImageGroupLabels[groupKey]}至少上传 1 张后才能提交审核`,
      };
    }
  }

  return { ok: true };
};

const validateReviewRequiredCertificates = async (merchantUserId) => {
  const placeholders = reviewRequiredCertificateGroups.map(() => '?').join(',');
  const rows = await query(
    `SELECT cert_group, COUNT(*) AS total
     FROM merchant_hotel_certificates
     WHERE merchant_user_id = ?
       AND cert_group IN (${placeholders})
     GROUP BY cert_group`,
    [merchantUserId, ...reviewRequiredCertificateGroups]
  );

  const counters = rows.reduce((acc, row) => {
    acc[row.cert_group] = Number(row.total) || 0;
    return acc;
  }, {});

  for (const groupKey of reviewRequiredCertificateGroups) {
    if ((counters[groupKey] || 0) < 1) {
      return {
        ok: false,
        field: `hotelCertificates.${groupKey}`,
        message: `${hotelCertificateGroupLabels[groupKey]}至少上传 1 张后才能提交审核`,
      };
    }
  }

  return { ok: true };
};

module.exports = {
  getGroupedHotelImages,
  uploadHotelImageByMerchantId,
  deleteHotelImageByMerchantId,
  sortHotelImagesByMerchantId,
  getGroupedHotelCertificates,
  uploadHotelCertificateByMerchantId,
  deleteHotelCertificateByMerchantId,
  validateReviewRequiredImages,
  validateReviewRequiredCertificates,
};
