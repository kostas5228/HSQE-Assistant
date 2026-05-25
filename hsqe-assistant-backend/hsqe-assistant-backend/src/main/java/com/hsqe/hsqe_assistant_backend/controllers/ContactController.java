package com.hsqe.hsqe_assistant_backend.controllers;

import com.hsqe.hsqe_assistant_backend.dto.ContactDTO;
import com.hsqe.hsqe_assistant_backend.domain.Contact;
import com.hsqe.hsqe_assistant_backend.mappers.ContactMapper;
import com.hsqe.hsqe_assistant_backend.services.ContactService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/contacts")
public class ContactController {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(ContactController.class);
    private final ContactService contactService;
    private final ContactMapper contactMapper;

    public ContactController(ContactService contactService, ContactMapper contactMapper) {
        this.contactService = contactService;
        this.contactMapper = contactMapper;
    }

    @GetMapping
    public List<ContactDTO> getAllContacts() {
        log.info("API call: getAllContacts");
        return contactService.getAllContacts().stream()
                .map(contactMapper::toDTO)
                .toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<ContactDTO> getContactById(@PathVariable Long id) {
        return contactService.getContactById(id)
                .map(contactMapper::toDTO)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ContactDTO createContact(@RequestBody ContactDTO contactDTO) {
        log.debug("API call: createContact with data: {}", contactDTO);
        Contact saved = contactService.saveContact(contactMapper.toDomain(contactDTO));
        return contactMapper.toDTO(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ContactDTO> updateContact(@PathVariable Long id, @RequestBody ContactDTO contactDTO) {
        log.debug("API call: updateContact id={} data={}", id, contactDTO);
        return contactService.getContactById(id)
                .map(existing -> {
                    contactDTO.setId(id);
                    Contact saved = contactService.saveContact(contactMapper.toDomain(contactDTO));
                    return ResponseEntity.ok(contactMapper.toDTO(saved));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteContact(@PathVariable Long id) {
        log.warn("API call: deleteContact with id: {}", id);
        contactService.deleteContact(id);
        return ResponseEntity.noContent().build();
    }
}
