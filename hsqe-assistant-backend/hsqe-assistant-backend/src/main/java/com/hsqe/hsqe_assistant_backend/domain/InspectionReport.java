package com.hsqe.hsqe_assistant_backend.domain;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class InspectionReport {
    private Long id;
    private LocalDate date;
    private String vessel;
    private String typeOfInspection;
    private String placeOfInspection;
    private List<String> attachments;
    private String notes;
    private Map<String, Integer> counts;

    // New fields
    private String pscAuthority;
    private Boolean detention;
    private java.math.BigDecimal cost;
    private String flagState;
    private Integer validity;

    private String inspectorName;
}
