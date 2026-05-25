package com.hsqe.hsqe_assistant_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TaskDTO {
    private Long id;
    private String title;
    private List<String> steps;
    private Boolean addToMyDaySwitch;
    private Boolean importantSwitch;
    private String vessel;
    private String assignedTo;
    private LocalDate dueDate;
    private LocalDateTime reminder;
    private String notes;
    private List<String> attachments;
}
