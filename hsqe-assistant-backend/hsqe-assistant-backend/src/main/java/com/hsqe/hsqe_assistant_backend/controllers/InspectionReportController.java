package com.hsqe.hsqe_assistant_backend.controllers;

import com.hsqe.hsqe_assistant_backend.dto.InspectionReportDTO;
import com.hsqe.hsqe_assistant_backend.domain.InspectionReport;
import com.hsqe.hsqe_assistant_backend.mappers.InspectionReportMapper;
import com.hsqe.hsqe_assistant_backend.services.InspectionReportService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inspection-reports")
public class InspectionReportController {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(InspectionReportController.class);
    private final InspectionReportService inspectionReportService;
    private final InspectionReportMapper inspectionReportMapper;

    public InspectionReportController(InspectionReportService inspectionReportService, InspectionReportMapper inspectionReportMapper) {
        this.inspectionReportService = inspectionReportService;
        this.inspectionReportMapper = inspectionReportMapper;
    }

    @GetMapping
    public List<InspectionReportDTO> getAllInspectionReports() {
        log.info("API call: getAllInspectionReports");
        return inspectionReportService.getAllInspectionReports().stream()
                .map(inspectionReportMapper::toDTO)
                .toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<InspectionReportDTO> getInspectionReportById(@PathVariable Long id) {
        return inspectionReportService.getInspectionReportById(id)
                .map(inspectionReportMapper::toDTO)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public InspectionReportDTO createInspectionReport(@RequestBody InspectionReportDTO inspectionReportDTO) {
        log.debug("API call: createInspectionReport with data: {}", inspectionReportDTO);
        InspectionReport saved = inspectionReportService.saveInspectionReport(inspectionReportMapper.toDomain(inspectionReportDTO));
        return inspectionReportMapper.toDTO(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<InspectionReportDTO> updateInspectionReport(@PathVariable Long id,
                                                                      @RequestBody InspectionReportDTO inspectionReportDTO) {
        log.debug("API call: updateInspectionReport id={} data={}", id, inspectionReportDTO);
        return inspectionReportService.getInspectionReportById(id)
                .map(existing -> {
                    inspectionReportDTO.setId(id);
                    InspectionReport saved = inspectionReportService.saveInspectionReport(
                            inspectionReportMapper.toDomain(inspectionReportDTO));
                    return ResponseEntity.ok(inspectionReportMapper.toDTO(saved));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteInspectionReport(@PathVariable Long id) {
        log.warn("API call: deleteInspectionReport with id: {}", id);
        inspectionReportService.deleteInspectionReport(id);
        return ResponseEntity.noContent().build();
    }
}
