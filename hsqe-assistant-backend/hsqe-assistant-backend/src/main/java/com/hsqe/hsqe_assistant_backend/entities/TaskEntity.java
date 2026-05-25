package com.hsqe.hsqe_assistant_backend.entities;

import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Getter
@Setter
public class TaskEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    @NotNull
    private String title;

    @ElementCollection
    private List<String> steps;

    private Boolean addToMyDaySwitch = false;

    private Boolean importantSwitch = false;

    private String vessel;

    private String assignedTo;

    private LocalDate dueDate;

    private LocalDateTime reminder;

    private String notes;

    @ElementCollection
    private List<String> attachments;

}
