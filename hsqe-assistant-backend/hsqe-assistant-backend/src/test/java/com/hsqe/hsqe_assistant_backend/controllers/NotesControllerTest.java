package com.hsqe.hsqe_assistant_backend.controllers;

import com.hsqe.hsqe_assistant_backend.domain.Notes;
import com.hsqe.hsqe_assistant_backend.dto.NotesDTO;
import com.hsqe.hsqe_assistant_backend.mappers.NotesMapper;
import com.hsqe.hsqe_assistant_backend.services.NotesService;
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

class NotesControllerTest {
    @Mock
    private NotesService notesService;
    @Mock
    private NotesMapper notesMapper;
    @InjectMocks
    private NotesController notesController;

    @BeforeEach
    void setUp() { MockitoAnnotations.openMocks(this); }

    @Test
    void getAllNotes_returnsList() {
        Notes domain = new Notes();
        NotesDTO dto = new NotesDTO();
        when(notesService.getAllNotes()).thenReturn(Collections.singletonList(domain));
        when(notesMapper.toDTO(domain)).thenReturn(dto);
        List<NotesDTO> result = notesController.getAllNotes();
        assertEquals(1, result.size());
    }

    @Test
    void getNotesById_found() {
        Notes domain = new Notes();
        NotesDTO dto = new NotesDTO();
        when(notesService.getNotesById(1L)).thenReturn(Optional.of(domain));
        when(notesMapper.toDTO(domain)).thenReturn(dto);
        ResponseEntity<NotesDTO> response = notesController.getNotesById(1L);
        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
    }

    @Test
    void getNotesById_notFound() {
        when(notesService.getNotesById(1L)).thenReturn(Optional.empty());
        ResponseEntity<NotesDTO> response = notesController.getNotesById(1L);
        assertEquals(404, response.getStatusCode().value());
    }

    @Test
    void createNotes_returnsCreated() {
        NotesDTO dto = new NotesDTO();
        Notes domain = new Notes();
        when(notesMapper.toDomain(dto)).thenReturn(domain);
        when(notesService.saveNotes(domain)).thenReturn(domain);
        when(notesMapper.toDTO(domain)).thenReturn(dto);
        NotesDTO result = notesController.createNotes(dto);
        assertNotNull(result);
    }

    @Test
    void deleteNotes_returnsNoContent() {
        doNothing().when(notesService).deleteNotes(1L);
        ResponseEntity<Void> response = notesController.deleteNotes(1L);
        assertEquals(204, response.getStatusCode().value());
    }
}
