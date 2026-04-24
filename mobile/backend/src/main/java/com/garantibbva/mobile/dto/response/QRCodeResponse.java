package com.garantibbva.mobile.dto.response;

import java.util.Map;

public class QRCodeResponse {
    private String qrCode;
    private Map<String, Object> qrData;
    private String message;
    
    public QRCodeResponse() {}
    
    public String getQrCode() { return qrCode; }
    public void setQrCode(String qrCode) { this.qrCode = qrCode; }
    public Map<String, Object> getQrData() { return qrData; }
    public void setQrData(Map<String, Object> qrData) { this.qrData = qrData; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    
    public static Builder builder() { return new Builder(); }
    
    public static class Builder {
        private final QRCodeResponse r = new QRCodeResponse();
        public Builder qrCode(String qrCode) { r.qrCode = qrCode; return this; }
        public Builder qrData(Map<String, Object> qrData) { r.qrData = qrData; return this; }
        public Builder message(String message) { r.message = message; return this; }
        public QRCodeResponse build() { return r; }
    }
}