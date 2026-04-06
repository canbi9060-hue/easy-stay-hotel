import React from 'react';
import { InputNumber, Space } from 'antd';

const baseAddonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 52,
  padding: '0 14px',
  border: '1px solid #d9d9d9',
  background: '#fafafa',
  lineHeight: 1,
  whiteSpace: 'nowrap',
};

const enabledAddonStyle = {
  color: 'rgba(0, 0, 0, 0.88)',
};

const disabledAddonStyle = {
  color: 'rgba(0, 0, 0, 0.25)',
  background: '#f5f5f5',
};

const prefixAddonStyle = {
  ...baseAddonStyle,
  borderRight: 0,
  borderRadius: '8px 0 0 8px',
};

const suffixAddonStyle = {
  ...baseAddonStyle,
  borderLeft: 0,
  borderRadius: '0 8px 8px 0',
};

const prefixInputStyle = {
  borderRadius: '0 8px 8px 0',
};

const suffixInputStyle = {
  borderRadius: '8px 0 0 8px',
};

export default function CompactNumberInput({
  addon,
  addonPosition = 'suffix',
  style,
  ...inputProps
}) {
  const disabled = Boolean(inputProps.disabled);
  const addonStyle = {
    ...(addonPosition === 'prefix' ? prefixAddonStyle : suffixAddonStyle),
    ...(disabled ? disabledAddonStyle : enabledAddonStyle),
  };
  const inputStyle = {
    width: '100%',
    ...(addonPosition === 'prefix' ? prefixInputStyle : suffixInputStyle),
    ...style,
  };

  return (
    <Space.Compact style={{ width: '100%' }}>
      {addonPosition === 'prefix' ? <span style={addonStyle}>{addon}</span> : null}
      <InputNumber {...inputProps} style={inputStyle} />
      {addonPosition === 'suffix' ? <span style={addonStyle}>{addon}</span> : null}
    </Space.Compact>
  );
}
