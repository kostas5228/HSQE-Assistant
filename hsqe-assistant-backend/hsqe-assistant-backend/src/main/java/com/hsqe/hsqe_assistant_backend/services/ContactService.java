package com.hsqe.hsqe_assistant_backend.services;

import com.hsqe.hsqe_assistant_backend.domain.Contact;
import com.hsqe.hsqe_assistant_backend.entities.ContactEntity;
import com.hsqe.hsqe_assistant_backend.mappers.ContactMapper;
import com.hsqe.hsqe_assistant_backend.repositories.ContactRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class ContactService {
    private final ContactRepository contactRepository;
    private final ContactMapper contactMapper;
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(ContactService.class);

    public ContactService(ContactRepository contactRepository, ContactMapper contactMapper) {
        this.contactRepository = contactRepository;
        this.contactMapper = contactMapper;
    }

    public List<Contact> getAllContacts() {
        log.info("Fetching all contacts");
        return contactRepository.findAll().stream()
                .map(contactMapper::toDomainEntity)
                .toList();
    }

    public Optional<Contact> getContactById(Long id) {
        return contactRepository.findById(id).map(contactMapper::toDomainEntity);
    }

    @Transactional
    public Contact saveContact(Contact contact) {
        // Contact payload contains PII (name, phone numbers) — DEBUG only.
        log.debug("Saving contact: {}", contact);
        ContactEntity entity = contactMapper.toEntity(contact);
        ContactEntity saved = contactRepository.save(entity);
        return contactMapper.toDomainEntity(saved);
    }

    @Transactional
    public void deleteContact(Long id) {
        log.warn("Deleting contact with id: {}", id);
        contactRepository.deleteById(id);
    }
}
