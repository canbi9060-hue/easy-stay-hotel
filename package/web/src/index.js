import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { ConfigProvider, App } from 'antd';
import store from './store';
import AppRouter from './AppRouter';

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <ConfigProvider>
        <App>
          <AppRouter />
        </App>
      </ConfigProvider>
    </Provider>
  </React.StrictMode>
);