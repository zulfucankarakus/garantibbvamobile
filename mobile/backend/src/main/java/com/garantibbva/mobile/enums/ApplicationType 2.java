package com.garantibbva.mobile.enums;

public enum ApplicationType {
    ACCOUNT("account"),
    CARD("card");

    private final String value;

    ApplicationType(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
}