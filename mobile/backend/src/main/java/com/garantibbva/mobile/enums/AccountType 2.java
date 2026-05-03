package com.garantibbva.mobile.enums;

public enum AccountType {
    CHECKING("checking"),
    SAVINGS("savings"),
    BUSINESS("business"),
    MEAL("meal");

    private final String value;

    AccountType(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
}