package com.hsqe.hsqe_assistant_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ContactDTO {
    private Long id;
    private String name;
    private String shortIdentifier;
    private String department;
    private String businessPhone;
    private String personalPhone;
    private String extension;
    private List<String> assignedVessels;
}
