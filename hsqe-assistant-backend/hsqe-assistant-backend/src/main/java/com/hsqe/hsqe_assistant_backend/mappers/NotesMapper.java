package com.hsqe.hsqe_assistant_backend.mappers;

import com.hsqe.hsqe_assistant_backend.domain.Notes;
import com.hsqe.hsqe_assistant_backend.dto.NotesDTO;
import com.hsqe.hsqe_assistant_backend.entities.NotesEntity;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface NotesMapper {
    NotesDTO toDTO(Notes domain);
    Notes toDomain(NotesDTO dto);
    NotesEntity toEntity(Notes domain);
    Notes toDomainEntity(NotesEntity entity);
}
