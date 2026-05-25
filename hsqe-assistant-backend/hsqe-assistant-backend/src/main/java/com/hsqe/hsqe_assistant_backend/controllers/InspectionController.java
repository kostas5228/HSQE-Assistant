package com.hsqe.hsqe_assistant_backend.controllers;

import com.hsqe.hsqe_assistant_backend.dto.InspectionDTO;
import com.hsqe.hsqe_assistant_backend.domain.Inspection;
import com.hsqe.hsqe_assistant_backend.mappers.InspectionMapper;
import com.hsqe.hsqe_assistant_backend.services.InspectionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inspections")
public class InspectionController {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(InspectionController.class);
    private final InspectionService inspectionService;
    private final InspectionMapper inspectionMapper;

    public InspectionController(InspectionService inspectionService, InspectionMapper inspectionMapper) {
        this.inspectionService = inspectionService;
        this.inspectionMapper = inspectionMapper;
    }

    @GetMapping
    public List<InspectionDTO> getAllInspections() {
        log.info("API call: getAllInspections");
        return inspectionService.getAllInspections().stream()
                .map(inspectionMapper::toDTO)
                .toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<InspectionDTO> getInspectionById(@PathVariable Long id) {
        return inspectionService.getInspectionById(id)
                .map(inspectionMapper::toDTO)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public InspectionDTO createInspection(@RequestBody InspectionDTO inspectionDTO) {
        log.debug("API call: createInspection with data: {}", inspectionDTO);
        Inspection saved = inspectionService.saveInspection(inspectionMapper.toDomain(inspectionDTO));
        return inspectionMapper.toDTO(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<InspectionDTO> updateInspection(@PathVariable Long id,
                                                          @RequestBody InspectionDTO inspectionDTO) {
        log.debug("API call: updateInspection id={} data={}", id, inspectionDTO);
        return inspectionService.getInspectionById(id)
                .map(existing -> {
                    inspectionDTO.setId(id);
                    Inspection saved = inspectionService.saveInspection(inspectionMapper.toDomain(inspectionDTO));
                    return ResponseEntity.ok(inspectionMapper.toDTO(saved));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteInspection(@PathVariable Long id) {
        log.warn("API call: deleteInspection with id: {}", id);
        inspectionService.deleteInspection(id);
        return ResponseEntity.noContent().build();
    }
}
