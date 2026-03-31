import { DEFAULT_CENTER } from './constants';
import { extractCoordinates, normalizeCoordinates } from './shared';

// 渲染或更新地图实例，并统一处理点选与拖拽选点逻辑。
export const renderMapInstance = (AMap, container, coordinates, refs, onPointSelect) => {
  if (!AMap || !container || !refs?.mapRef || !refs?.markerRef) {
    return;
  }

  const { mapRef, markerRef, clickHandlerRef, dragHandlerRef } = refs;
  const activeContainer = mapRef.current?.getContainer?.();
  if (mapRef.current && activeContainer && activeContainer !== container) {
    destroyMapInstance(refs);
  }
  const position = normalizeCoordinates(coordinates);
  const hasPosition = Boolean(position);
  const center = hasPosition
    ? [position.longitude, position.latitude]
    : [DEFAULT_CENTER.longitude, DEFAULT_CENTER.latitude];

  if (!mapRef.current) {
    mapRef.current = new AMap.Map(container, {
      resizeEnable: true,
      viewMode: '2D',
      zoom: hasPosition ? 15 : 11,
      center,
    });

    if (AMap.TileLayer) {
      try {
        mapRef.current.add(new AMap.TileLayer());
      } catch (error) {
        // 旧版插件环境下可能不需要显式添加底图图层。
      }
    }

    if (AMap.Scale) {
      mapRef.current.addControl(new AMap.Scale());
    }

    if (AMap.ToolBar) {
      mapRef.current.addControl(new AMap.ToolBar());
    }
  } else {
    mapRef.current.setCenter(center);
    mapRef.current.setZoom(hasPosition ? 15 : 11);
  }

  if (!clickHandlerRef.current) {
    clickHandlerRef.current = (event) => {
      const point = extractCoordinates(event);
      if (point) {
        onPointSelect?.(point);
      }
    };

    mapRef.current.on('click', clickHandlerRef.current);
  }

  if (!hasPosition) {
    if (markerRef.current) {
      if (dragHandlerRef.current) {
        markerRef.current.off('dragend', dragHandlerRef.current);
      }

      mapRef.current.remove?.(markerRef.current);
      markerRef.current = null;
      dragHandlerRef.current = null;
    }

    return;
  }

  if (!markerRef.current) {
    markerRef.current = new AMap.Marker({
      position: center,
      draggable: true,
    });
    mapRef.current.add(markerRef.current);
  } else {
    markerRef.current.setPosition(center);
  }

  if (!dragHandlerRef.current) {
    dragHandlerRef.current = (event) => {
      const point = extractCoordinates(event) || extractCoordinates(event?.target?.getPosition?.());
      if (point) {
        onPointSelect?.(point);
      }
    };

    markerRef.current.on('dragend', dragHandlerRef.current);
  }
};

// 销毁地图实例和事件绑定，避免弹窗关闭后遗留无效引用。
export const destroyMapInstance = (refs) => {
  const { mapRef, markerRef, clickHandlerRef, dragHandlerRef } = refs || {};

  if (markerRef?.current && dragHandlerRef?.current) {
    markerRef.current.off('dragend', dragHandlerRef.current);
  }

  if (mapRef?.current && clickHandlerRef?.current) {
    mapRef.current.off('click', clickHandlerRef.current);
  }

  mapRef?.current?.destroy();

  if (mapRef) {
    mapRef.current = null;
  }
  if (markerRef) {
    markerRef.current = null;
  }
  if (clickHandlerRef) {
    clickHandlerRef.current = null;
  }
  if (dragHandlerRef) {
    dragHandlerRef.current = null;
  }
};
