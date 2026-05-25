package com.hsqe.hsqe_assistant_backend.domain;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Contact {
    private Long id;
    private String name;
    private String shortIdentifier;
    private String department;
    private String businessPhone;
    private String personalPhone;
    private String extension;
    private List<String> assignedVessels;
}
