package com.hsqe.hsqe_assistant_backend.entities;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Getter
@Setter
public class InspectionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDate inspectionDate;

    @NotNull
    private String vessel;

    @NotNull
    private String inspectionType;

    private String placeOfInspection;

    private String cpa;

    private String code;

    @NotNull
    private String findingType;

    private String master;

    private String chiefEngineer;

    @NotNull
    private String description;

    private String correctiveAction;

    private String preventiveAction;

    private String notes;

    private String pscAuthority;

    private String flagState;

    private String inspectorName;
}
