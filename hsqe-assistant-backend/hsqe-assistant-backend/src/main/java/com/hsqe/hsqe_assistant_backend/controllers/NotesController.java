package com.hsqe.hsqe_assistant_backend.controllers;

import com.hsqe.hsqe_assistant_backend.dto.NotesDTO;
import com.hsqe.hsqe_assistant_backend.domain.Notes;
import com.hsqe.hsqe_assistant_backend.mappers.NotesMapper;
import com.hsqe.hsqe_assistant_backend.services.NotesService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notes")
public class NotesController {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(NotesController.class);
    private final NotesService notesService;
    private final NotesMapper notesMapper;

    public NotesController(NotesService notesService, NotesMapper notesMapper) {
        this.notesService = notesService;
        this.notesMapper = notesMapper;
    }

    @GetMapping
    public List<NotesDTO> getAllNotes() {
        log.info("API call: getAllNotes");
        return notesService.getAllNotes().stream()
                .map(notesMapper::toDTO)
                .toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<NotesDTO> getNotesById(@PathVariable Long id) {
        return notesService.getNotesById(id)
                .map(notesMapper::toDTO)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public NotesDTO createNotes(@RequestBody NotesDTO notesDTO) {
        log.debug("API call: createNotes with data: {}", notesDTO);
        Notes saved = notesService.saveNotes(notesMapper.toDomain(notesDTO));
        return notesMapper.toDTO(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<NotesDTO> updateNotes(@PathVariable Long id, @RequestBody NotesDTO notesDTO) {
        log.debug("API call: updateNotes id={} data={}", id, notesDTO);
        return notesService.getNotesById(id)
                .map(existing -> {
                    notesDTO.setId(id);
                    Notes saved = notesService.saveNotes(notesMapper.toDomain(notesDTO));
                    return ResponseEntity.ok(notesMapper.toDTO(saved));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotes(@PathVariable Long id) {
        log.warn("API call: deleteNotes with id: {}", id);
        notesService.deleteNotes(id);
        return ResponseEntity.noContent().build();
    }
}
