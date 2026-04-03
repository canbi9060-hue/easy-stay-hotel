import React from 'react';
import BasicInfoModule from './modules/BasicInfoModule';
import CertificatesModule from './modules/CertificatesModule';
import FacilitiesModule from './modules/FacilitiesModule';
import ImagesModule from './modules/ImagesModule';

export default function HotelInfoTabs({
  activeTab,
  setActiveTab,
  tabs,
  basicProps,
  imagesProps,
  facilitiesProps,
  certificatesProps,
}) {
  return (
    <>
      <div className="hotel-info__tabs" role="tablist" aria-label="酒店资料分栏">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`hotel-info__tab ${activeTab === tab.key ? 'is-active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === 'basic'
        ? <BasicInfoModule {...basicProps} />
        : activeTab === 'images'
          ? <ImagesModule {...imagesProps} />
          : activeTab === 'facilities'
            ? <FacilitiesModule {...facilitiesProps} />
            : activeTab === 'certificates'
              ? <CertificatesModule {...certificatesProps} />
              : null}
    </>
  );
}
