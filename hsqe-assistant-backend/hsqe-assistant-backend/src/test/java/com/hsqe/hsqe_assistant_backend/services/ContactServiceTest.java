package com.hsqe.hsqe_assistant_backend.services;

import com.hsqe.hsqe_assistant_backend.domain.Contact;
import com.hsqe.hsqe_assistant_backend.entities.ContactEntity;
import com.hsqe.hsqe_assistant_backend.mappers.ContactMapper;
import com.hsqe.hsqe_assistant_backend.repositories.ContactRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import java.util.Collections;
import java.util.Optional;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ContactServiceTest {
    @Mock
    private ContactRepository contactRepository;
    @Mock
    private ContactMapper contactMapper;
    @InjectMocks
    private ContactService contactService;

    @BeforeEach
    void setUp() { MockitoAnnotations.openMocks(this); }

    @Test
    void getAllContacts_returnsList() {
        ContactEntity entity = new ContactEntity();
        Contact domain = new Contact();
        when(contactRepository.findAll()).thenReturn(Collections.singletonList(entity));
        when(contactMapper.toDomainEntity(entity)).thenReturn(domain);
        List<Contact> result = contactService.getAllContacts();
        assertEquals(1, result.size());
    }

    @Test
    void getContactById_returnsContact() {
        ContactEntity entity = new ContactEntity();
        Contact domain = new Contact();
        when(contactRepository.findById(1L)).thenReturn(Optional.of(entity));
        when(contactMapper.toDomainEntity(entity)).thenReturn(domain);
        Optional<Contact> result = contactService.getContactById(1L);
        assertTrue(result.isPresent());
    }

    @Test
    void saveContact_savesAndReturnsContact() {
        Contact domain = new Contact();
        ContactEntity entity = new ContactEntity();
        when(contactMapper.toEntity(domain)).thenReturn(entity);
        when(contactRepository.save(entity)).thenReturn(entity);
        when(contactMapper.toDomainEntity(entity)).thenReturn(domain);
        Contact result = contactService.saveContact(domain);
        assertNotNull(result);
    }

    @Test
    void deleteContact_deletesById() {
        doNothing().when(contactRepository).deleteById(1L);
        contactService.deleteContact(1L);
        verify(contactRepository, times(1)).deleteById(1L);
    }
}
