package com.hsqe.hsqe_assistant_backend.services;

import com.hsqe.hsqe_assistant_backend.domain.InspectionReport;
import com.hsqe.hsqe_assistant_backend.entities.InspectionReportEntity;
import com.hsqe.hsqe_assistant_backend.mappers.InspectionReportMapper;
import com.hsqe.hsqe_assistant_backend.repositories.InspectionReportRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class InspectionReportService {
    private final InspectionReportRepository inspectionReportRepository;
    private final InspectionReportMapper inspectionReportMapper;
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(InspectionReportService.class);

    public InspectionReportService(InspectionReportRepository inspectionReportRepository, InspectionReportMapper inspectionReportMapper) {
        this.inspectionReportRepository = inspectionReportRepository;
        this.inspectionReportMapper = inspectionReportMapper;
    }

    public List<InspectionReport> getAllInspectionReports() {
        log.info("Fetching all inspection reports");
        return inspectionReportRepository.findAll().stream()
                .map(inspectionReportMapper::toDomainEntity)
                .toList();
    }

    public Optional<InspectionReport> getInspectionReportById(Long id) {
        return inspectionReportRepository.findById(id).map(inspectionReportMapper::toDomainEntity);
    }

    @Transactional
    public InspectionReport saveInspectionReport(InspectionReport inspectionReport) {
        validateInspectionReportFields(inspectionReport);
        // Free-text fields (notes, inspectorName) — keep out of INFO logs.
        log.debug("Saving inspection report: {}", inspectionReport);
        InspectionReportEntity entity = inspectionReportMapper.toEntity(inspectionReport);
        InspectionReportEntity saved = inspectionReportRepository.save(entity);
        return inspectionReportMapper.toDomainEntity(saved);
    }

    private void validateInspectionReportFields(InspectionReport inspectionReport) {
        String type = inspectionReport.getTypeOfInspection();
        if ("PSC".equalsIgnoreCase(type)) {
            if (inspectionReport.getPscAuthority() == null || inspectionReport.getPscAuthority().isEmpty()) {
                throw new IllegalArgumentException("pscAuthority is required for PSC inspection reports");
            }
            if (inspectionReport.getDetention() == null) {
                inspectionReport.setDetention(false);
            }
            if (inspectionReport.getFlagState() != null) {
                throw new IllegalArgumentException("flagState must be null for PSC inspection reports");
            }
            if (inspectionReport.getValidity() != null) {
                throw new IllegalArgumentException("validity must be null for PSC inspection reports");
            }
            if (inspectionReport.getInspectorName() != null) {
                throw new IllegalArgumentException("inspectorName must be null for PSC inspection reports");
            }
        } else if ("Vetting".equalsIgnoreCase(type)) {
            // NOTE: this branch must come BEFORE the generic Flag/Vetting one
            // below — otherwise it is unreachable.
            if (inspectionReport.getValidity() == null) {
                throw new IllegalArgumentException("validity is required for Vetting inspection reports");
            }
            if (inspectionReport.getPscAuthority() != null
                    || inspectionReport.getDetention() != null
                    || inspectionReport.getCost() != null
                    || inspectionReport.getFlagState() != null) {
                throw new IllegalArgumentException(
                        "pscAuthority, detention, cost, and flagState must be null for Vetting inspection reports");
            }
        }
        // "Flag" and any other type require no extra validation today.
    }

    @Transactional
    public void deleteInspectionReport(Long id) {
        log.warn("Deleting inspection report with id: {}", id);
        inspectionReportRepository.deleteById(id);
    }
}
