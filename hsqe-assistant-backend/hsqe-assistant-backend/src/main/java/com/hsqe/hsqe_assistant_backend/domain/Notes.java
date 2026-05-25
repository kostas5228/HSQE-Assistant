package com.hsqe.hsqe_assistant_backend.domain;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Notes {
    private Long id;
    private String title;
    private String notes;
    private String vessel;
    private LocalDate reminder;
    private Boolean pin;
    private String color;
}
