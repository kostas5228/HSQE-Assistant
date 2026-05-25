package com.hsqe.hsqe_assistant_backend.services;

import com.hsqe.hsqe_assistant_backend.domain.Notes;
import com.hsqe.hsqe_assistant_backend.entities.NotesEntity;
import com.hsqe.hsqe_assistant_backend.mappers.NotesMapper;
import com.hsqe.hsqe_assistant_backend.repositories.NotesRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class NotesService {
    private final NotesRepository notesRepository;
    private final NotesMapper notesMapper;
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(NotesService.class);

    public NotesService(NotesRepository notesRepository, NotesMapper notesMapper) {
        this.notesRepository = notesRepository;
        this.notesMapper = notesMapper;
    }

    public List<Notes> getAllNotes() {
        log.info("Fetching all notes");
        return notesRepository.findAll().stream()
                .map(notesMapper::toDomainEntity)
                .toList();
    }

    public Optional<Notes> getNotesById(Long id) {
        return notesRepository.findById(id).map(notesMapper::toDomainEntity);
    }

    @Transactional
    public Notes saveNotes(Notes notes) {
        log.debug("Saving notes: {}", notes);
        NotesEntity entity = notesMapper.toEntity(notes);
        NotesEntity saved = notesRepository.save(entity);
        return notesMapper.toDomainEntity(saved);
    }

    @Transactional
    public void deleteNotes(Long id) {
        log.warn("Deleting notes with id: {}", id);
        notesRepository.deleteById(id);
    }
}
