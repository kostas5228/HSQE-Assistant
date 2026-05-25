package com.hsqe.hsqe_assistant_backend.mappers;

import com.hsqe.hsqe_assistant_backend.dto.CertificateDTO;
import com.hsqe.hsqe_assistant_backend.domain.Certificate;
import com.hsqe.hsqe_assistant_backend.entities.CertificateEntity;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface CertificateMapper {
    CertificateDTO toDTO(Certificate certificate);
    Certificate toDomain(CertificateDTO dto);
    CertificateEntity toEntity(Certificate certificate);
    Certificate toDomainEntity(CertificateEntity entity);
}
