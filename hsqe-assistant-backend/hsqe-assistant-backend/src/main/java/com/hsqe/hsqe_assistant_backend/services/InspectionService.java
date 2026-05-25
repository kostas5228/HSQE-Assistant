package com.hsqe.hsqe_assistant_backend.services;

import com.hsqe.hsqe_assistant_backend.domain.Inspection;
import com.hsqe.hsqe_assistant_backend.entities.InspectionEntity;
import com.hsqe.hsqe_assistant_backend.mappers.InspectionMapper;
import com.hsqe.hsqe_assistant_backend.repositories.InspectionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class InspectionService {
    private final InspectionRepository inspectionRepository;
    private final InspectionMapper inspectionMapper;
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(InspectionService.class);

    public InspectionService(InspectionRepository inspectionRepository, InspectionMapper inspectionMapper) {
        this.inspectionRepository = inspectionRepository;
        this.inspectionMapper = inspectionMapper;
    }

    public List<Inspection> getAllInspections() {
        log.info("Fetching all inspections");
        return inspectionRepository.findAll().stream()
                .map(inspectionMapper::toDomainEntity)
                .toList();
    }

    public Optional<Inspection> getInspectionById(Long id) {
        return inspectionRepository.findById(id).map(inspectionMapper::toDomainEntity);
    }

    @Transactional
    public Inspection saveInspection(Inspection inspection) {
        validateInspectionFields(inspection);
        // Payload may contain free-text fields (master, chiefEngineer,
        // inspectorName, description) — keep it out of INFO logs.
        log.debug("Saving inspection: {}", inspection);
        InspectionEntity entity = inspectionMapper.toEntity(inspection);
        InspectionEntity saved = inspectionRepository.save(entity);
        return inspectionMapper.toDomainEntity(saved);
    }

    @Transactional
    public void deleteInspection(Long id) {
        log.warn("Deleting inspection with id: {}", id);
        inspectionRepository.deleteById(id);
    }

    private void validateInspectionFields(Inspection inspection) {
        String type = inspection.getInspectionType();
        if ("PSC".equalsIgnoreCase(type)) {
            if (inspection.getPscAuthority() == null || inspection.getPscAuthority().isEmpty()) {
                throw new IllegalArgumentException("pscAuthority is required for PSC inspections");
            }
            if (inspection.getFlagState() != null) {
                throw new IllegalArgumentException("flagState must be null for PSC inspections");
            }
            if (inspection.getInspectorName() != null) {
                throw new IllegalArgumentException("inspectorName must be null for PSC inspections");
            }
        } else if ("Flag".equalsIgnoreCase(type) || "Vetting".equalsIgnoreCase(type)) {
            if ("Flag".equalsIgnoreCase(type)) {
                if (inspection.getFlagState() == null || inspection.getFlagState().isEmpty()) {
                    throw new IllegalArgumentException("flagState is required for Flag inspections");
                }
            }
            if (inspection.getInspectorName() == null || inspection.getInspectorName().isEmpty()) {
                throw new IllegalArgumentException("inspectorName is required for Flag or Vetting inspections");
            }
            if (inspection.getPscAuthority() != null) {
                throw new IllegalArgumentException("pscAuthority must be null for Flag or Vetting inspections");
            }
        } else {
            if (inspection.getPscAuthority() != null || inspection.getFlagState() != null || inspection.getInspectorName() != null) {
                throw new IllegalArgumentException("pscAuthority, flagState, and inspectorName must be null for other types");
            }
        }
    }
}
