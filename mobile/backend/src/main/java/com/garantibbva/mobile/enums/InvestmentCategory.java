package com.garantibbva.mobile.enums;

public enum InvestmentCategory {
    GOLD("gold"),
    FOREX("forex"),
    STOCK("stock"),
    CRYPTO("crypto");

    private final String value;

    InvestmentCategory(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
}