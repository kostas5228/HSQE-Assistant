package com.hsqe.hsqe_assistant_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class InspectionReportDTO {
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
    private BigDecimal cost;
    private String flagState;
    private Integer validity;

    private String inspectorName;
}
