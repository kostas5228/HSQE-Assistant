package com.hsqe.hsqe_assistant_backend.mappers;

import com.hsqe.hsqe_assistant_backend.domain.InspectionReport;
import com.hsqe.hsqe_assistant_backend.dto.InspectionReportDTO;
import com.hsqe.hsqe_assistant_backend.entities.InspectionReportEntity;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface InspectionReportMapper {
    InspectionReportDTO toDTO(InspectionReport domain);
    InspectionReport toDomain(InspectionReportDTO dto);
    InspectionReportEntity toEntity(InspectionReport domain);
    InspectionReport toDomainEntity(InspectionReportEntity entity);
}
