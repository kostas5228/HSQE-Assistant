package com.hsqe.hsqe_assistant_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CertificateDTO {
    private Long id;
    private String vessel;
    private String code;
    private String certificateType;
    private String certificateName;
    private LocalDate fromDate;
    private LocalDate toDate;
    private String notes;
}
