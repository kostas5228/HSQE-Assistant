package com.hsqe.hsqe_assistant_backend.mappers;

import com.hsqe.hsqe_assistant_backend.dto.ContactDTO;
import com.hsqe.hsqe_assistant_backend.domain.Contact;
import com.hsqe.hsqe_assistant_backend.entities.ContactEntity;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface ContactMapper {
    ContactDTO toDTO(Contact contact);
    Contact toDomain(ContactDTO dto);
    ContactEntity toEntity(Contact contact);
    Contact toDomainEntity(ContactEntity entity);
}
