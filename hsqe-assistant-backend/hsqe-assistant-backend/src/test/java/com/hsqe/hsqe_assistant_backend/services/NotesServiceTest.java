package com.hsqe.hsqe_assistant_backend.services;

import com.hsqe.hsqe_assistant_backend.domain.Notes;
import com.hsqe.hsqe_assistant_backend.entities.NotesEntity;
import com.hsqe.hsqe_assistant_backend.mappers.NotesMapper;
import com.hsqe.hsqe_assistant_backend.repositories.NotesRepository;
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

class NotesServiceTest {
    @Mock
    private NotesRepository notesRepository;
    @Mock
    private NotesMapper notesMapper;
    @InjectMocks
    private NotesService notesService;

    @BeforeEach
    void setUp() { MockitoAnnotations.openMocks(this); }

    @Test
    void getAllNotes_returnsList() {
        NotesEntity entity = new NotesEntity();
        Notes domain = new Notes();
        when(notesRepository.findAll()).thenReturn(Collections.singletonList(entity));
        when(notesMapper.toDomainEntity(entity)).thenReturn(domain);
        List<Notes> result = notesService.getAllNotes();
        assertEquals(1, result.size());
    }

    @Test
    void getNotesById_returnsNotes() {
        NotesEntity entity = new NotesEntity();
        Notes domain = new Notes();
        when(notesRepository.findById(1L)).thenReturn(Optional.of(entity));
        when(notesMapper.toDomainEntity(entity)).thenReturn(domain);
        Optional<Notes> result = notesService.getNotesById(1L);
        assertTrue(result.isPresent());
    }

    @Test
    void saveNotes_savesAndReturnsNotes() {
        Notes domain = new Notes();
        NotesEntity entity = new NotesEntity();
        when(notesMapper.toEntity(domain)).thenReturn(entity);
        when(notesRepository.save(entity)).thenReturn(entity);
        when(notesMapper.toDomainEntity(entity)).thenReturn(domain);
        Notes result = notesService.saveNotes(domain);
        assertNotNull(result);
    }

    @Test
    void deleteNotes_deletesById() {
        doNothing().when(notesRepository).deleteById(1L);
        notesService.deleteNotes(1L);
        verify(notesRepository, times(1)).deleteById(1L);
    }
}
