package com.hsqe.hsqe_assistant_backend.domain;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.Accessors;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Inspection {
    private Long id;
    private LocalDate inspectionDate;
    private String vessel;
    private String inspectionType;
    private String placeOfInspection;
    private String cpa;
    private String code;
    private String findingType;
    private String master;
    private String chiefEngineer;
    private String description;
    private String correctiveAction;
    private String preventiveAction;
    private String notes;
    // New fields for conditional logic
    private String pscAuthority;
    private String flagState;

    // New field: inspectorName (only for Flag or Vetting inspectionType)
    private String inspectorName;
}
