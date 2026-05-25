package com.hsqe.hsqe_assistant_backend.mappers;

import com.hsqe.hsqe_assistant_backend.dto.InspectionDTO;
import com.hsqe.hsqe_assistant_backend.domain.Inspection;
import com.hsqe.hsqe_assistant_backend.entities.InspectionEntity;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface InspectionMapper {
    InspectionDTO toDTO(Inspection inspection);
    Inspection toDomain(InspectionDTO dto);
    InspectionEntity toEntity(Inspection inspection);
    Inspection toDomainEntity(InspectionEntity entity);
}
