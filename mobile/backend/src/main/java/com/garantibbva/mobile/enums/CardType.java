package com.garantibbva.mobile.enums;

public enum CardType {
    DEBIT("debit"),
    CREDIT("credit");

    private final String value;

    CardType(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
}