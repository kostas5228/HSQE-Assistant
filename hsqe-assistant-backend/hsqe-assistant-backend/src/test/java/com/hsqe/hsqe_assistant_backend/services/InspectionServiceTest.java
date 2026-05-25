package com.hsqe.hsqe_assistant_backend.services;

import com.hsqe.hsqe_assistant_backend.domain.Inspection;
import com.hsqe.hsqe_assistant_backend.entities.InspectionEntity;
import com.hsqe.hsqe_assistant_backend.mappers.InspectionMapper;
import com.hsqe.hsqe_assistant_backend.repositories.InspectionRepository;
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

class InspectionServiceTest {
    @Mock
    private InspectionRepository inspectionRepository;
    @Mock
    private InspectionMapper inspectionMapper;
    @InjectMocks
    private InspectionService inspectionService;

    @BeforeEach
    void setUp() { MockitoAnnotations.openMocks(this); }

    @Test
    void getAllInspections_returnsList() {
        InspectionEntity entity = new InspectionEntity();
        Inspection domain = new Inspection();
        when(inspectionRepository.findAll()).thenReturn(Collections.singletonList(entity));
        when(inspectionMapper.toDomainEntity(entity)).thenReturn(domain);
        List<Inspection> result = inspectionService.getAllInspections();
        assertEquals(1, result.size());
    }

    @Test
    void getInspectionById_returnsInspection() {
        InspectionEntity entity = new InspectionEntity();
        Inspection domain = new Inspection();
        when(inspectionRepository.findById(1L)).thenReturn(Optional.of(entity));
        when(inspectionMapper.toDomainEntity(entity)).thenReturn(domain);
        Optional<Inspection> result = inspectionService.getInspectionById(1L);
        assertTrue(result.isPresent());
    }

    @Test
    void saveInspection_savesAndReturnsInspection() {
        Inspection domain = new Inspection();
        InspectionEntity entity = new InspectionEntity();
        when(inspectionMapper.toEntity(domain)).thenReturn(entity);
        when(inspectionRepository.save(entity)).thenReturn(entity);
        when(inspectionMapper.toDomainEntity(entity)).thenReturn(domain);
        Inspection result = inspectionService.saveInspection(domain);
        assertNotNull(result);
    }

    @Test
    void deleteInspection_deletesById() {
        doNothing().when(inspectionRepository).deleteById(1L);
        inspectionService.deleteInspection(1L);
        verify(inspectionRepository, times(1)).deleteById(1L);
    }

    @Test
    void saveInspection_throwsException_whenInspectorNameMissingForFlagOrVetting() {
        Inspection domain = new Inspection();
        domain.setInspectionType("Flag");
        domain.setFlagState("Greece");
        // inspectorName is missing
        Exception ex = assertThrows(IllegalArgumentException.class, () -> inspectionService.saveInspection(domain));
        assertTrue(ex.getMessage().contains("inspectorName is required"));

        domain.setInspectionType("Vetting");
        ex = assertThrows(IllegalArgumentException.class, () -> inspectionService.saveInspection(domain));
        assertTrue(ex.getMessage().contains("inspectorName is required"));
    }

    @Test
    void saveInspection_throwsException_whenInspectorNamePresentForPSC() {
        Inspection domain = new Inspection();
        domain.setInspectionType("PSC");
        domain.setPscAuthority("IMO");
        domain.setInspectorName("John Doe");
        Exception ex = assertThrows(IllegalArgumentException.class, () -> inspectionService.saveInspection(domain));
        assertTrue(ex.getMessage().contains("inspectorName must be null"));
    }

    @Test
    void saveInspection_throwsException_whenInspectorNamePresentForOtherTypes() {
        Inspection domain = new Inspection();
        domain.setInspectionType("Other");
        domain.setInspectorName("John Doe");
        Exception ex = assertThrows(IllegalArgumentException.class, () -> inspectionService.saveInspection(domain));
        assertTrue(ex.getMessage().contains("inspectorName must be null") || ex.getMessage().contains("pscAuthority, flagState, and inspectorName must be null"));
    }

    @Test
    void saveInspection_succeeds_whenInspectorNameValidForFlagOrVetting() {
        Inspection domain = new Inspection();
        domain.setInspectionType("Flag");
        domain.setFlagState("Greece");
        domain.setInspectorName("John Doe");
        InspectionEntity entity = new InspectionEntity();
        when(inspectionMapper.toEntity(domain)).thenReturn(entity);
        when(inspectionRepository.save(entity)).thenReturn(entity);
        when(inspectionMapper.toDomainEntity(entity)).thenReturn(domain);
        Inspection result = inspectionService.saveInspection(domain);
        assertNotNull(result);
    }
}
