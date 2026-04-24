package com.garantibbva.mobile.dto.response;

public class ApiResponse<T> {
    private boolean success;
    private String message;
    private T data;
    
    public ApiResponse() {}
    
    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public T getData() { return data; }
    public void setData(T data) { this.data = data; }
    
    public static <T> ApiResponse<T> success(T data) {
        ApiResponse<T> r = new ApiResponse<>();
        r.success = true;
        r.data = data;
        return r;
    }
    
    public static <T> ApiResponse<T> success(String message, T data) {
        ApiResponse<T> r = new ApiResponse<>();
        r.success = true;
        r.message = message;
        r.data = data;
        return r;
    }
    
    public static <T> ApiResponse<T> error(String message) {
        ApiResponse<T> r = new ApiResponse<>();
        r.success = false;
        r.message = message;
        return r;
    }
    
    public static <T> Builder<T> builder() { return new Builder<>(); }
    
    public static class Builder<T> {
        private final ApiResponse<T> r = new ApiResponse<>();
        public Builder<T> success(boolean success) { r.success = success; return this; }
        public Builder<T> message(String message) { r.message = message; return this; }
        public Builder<T> data(T data) { r.data = data; return this; }
        public ApiResponse<T> build() { return r; }
    }
}