package com.hsqe.hsqe_assistant_backend.entities;

import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class InspectionReportEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    private LocalDate date;

    @NotNull
    private String vessel;

    @NotNull
    private String typeOfInspection;

    private String placeOfInspection;

    @ElementCollection
    private List<String> attachments;

    private String notes;

    @ElementCollection
    private Map<String, Integer> counts;

    private String pscAuthority;

    private Boolean detention;

    private java.math.BigDecimal cost;

    private String flagState;

    private Integer validity;

    private String inspectorName;
}
