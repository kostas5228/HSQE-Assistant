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
public class CertificateEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    private String vessel;

    private String code;

    @NotNull
    private String certificateType;

    @NotNull
    private String certificateName;

    private LocalDate fromDate;

    @NotNull
    private LocalDate toDate;

    private String notes;
}
