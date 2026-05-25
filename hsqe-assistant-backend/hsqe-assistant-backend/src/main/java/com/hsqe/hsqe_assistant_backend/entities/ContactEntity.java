package com.hsqe.hsqe_assistant_backend.entities;

import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Entity
@Getter
@Setter
public class ContactEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    private String name;

    private String shortIdentifier;

    private String department;

    private String businessPhone;

    private String personalPhone;

    private String extension;

    /**
     * Vessels this contact is assigned to. {@link ElementCollection} is
     * required so JPA persists the list into a child table; without it
     * Hibernate cannot map a plain {@code List<String>}.
     */
    @ElementCollection
    private List<String> assignedVessels;

}
