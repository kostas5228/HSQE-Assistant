package com.hsqe.hsqe_assistant_backend.mappers;

import com.hsqe.hsqe_assistant_backend.dto.TaskDTO;
import com.hsqe.hsqe_assistant_backend.domain.Task;
import com.hsqe.hsqe_assistant_backend.entities.TaskEntity;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface TaskMapper {
    TaskDTO toDTO(Task task);
    Task toDomain(TaskDTO dto);
    TaskEntity toEntity(Task task);
    Task toDomainEntity(TaskEntity entity);
}
