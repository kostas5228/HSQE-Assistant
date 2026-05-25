package com.hsqe.hsqe_assistant_backend.controllers;

import com.hsqe.hsqe_assistant_backend.domain.Contact;
import com.hsqe.hsqe_assistant_backend.dto.ContactDTO;
import com.hsqe.hsqe_assistant_backend.mappers.ContactMapper;
import com.hsqe.hsqe_assistant_backend.services.ContactService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.ResponseEntity;
import java.util.Collections;
import java.util.Optional;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ContactControllerTest {
    @Mock
    private ContactService contactService;
    @Mock
    private ContactMapper contactMapper;
    @InjectMocks
    private ContactController contactController;

    @BeforeEach
    void setUp() { MockitoAnnotations.openMocks(this); }

    @Test
    void getAllContacts_returnsList() {
        Contact domain = new Contact();
        ContactDTO dto = new ContactDTO();
        when(contactService.getAllContacts()).thenReturn(Collections.singletonList(domain));
        when(contactMapper.toDTO(domain)).thenReturn(dto);
        List<ContactDTO> result = contactController.getAllContacts();
        assertEquals(1, result.size());
    }

    @Test
    void getContactById_found() {
        Contact domain = new Contact();
        ContactDTO dto = new ContactDTO();
        when(contactService.getContactById(1L)).thenReturn(Optional.of(domain));
        when(contactMapper.toDTO(domain)).thenReturn(dto);
        ResponseEntity<ContactDTO> response = contactController.getContactById(1L);
        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
    }

    @Test
    void getContactById_notFound() {
        when(contactService.getContactById(1L)).thenReturn(Optional.empty());
        ResponseEntity<ContactDTO> response = contactController.getContactById(1L);
        assertEquals(404, response.getStatusCode().value());
    }

    @Test
    void createContact_returnsCreated() {
        ContactDTO dto = new ContactDTO();
        Contact domain = new Contact();
        when(contactMapper.toDomain(dto)).thenReturn(domain);
        when(contactService.saveContact(domain)).thenReturn(domain);
        when(contactMapper.toDTO(domain)).thenReturn(dto);
        ContactDTO result = contactController.createContact(dto);
        assertNotNull(result);
    }

    @Test
    void deleteContact_returnsNoContent() {
        doNothing().when(contactService).deleteContact(1L);
        ResponseEntity<Void> response = contactController.deleteContact(1L);
        assertEquals(204, response.getStatusCode().value());
    }
}
