package com.garantibbva.mobile.dto.request;

import com.garantibbva.mobile.enums.CardType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class CreateCardRequest {
    
    @NotBlank(message = "Kart adı boş olamaz")
    private String name;
    
    @NotNull(message = "Kart tipi seçilmelidir")
    private CardType cardType;
    
    public CreateCardRequest() {}
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public CardType getCardType() { return cardType; }
    public void setCardType(CardType cardType) { this.cardType = cardType; }
}