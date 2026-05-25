package com.hsqe.hsqe_assistant_backend.controllers;

import com.hsqe.hsqe_assistant_backend.domain.Inspection;
import com.hsqe.hsqe_assistant_backend.dto.InspectionDTO;
import com.hsqe.hsqe_assistant_backend.mappers.InspectionMapper;
import com.hsqe.hsqe_assistant_backend.services.InspectionService;
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

class InspectionControllerTest {
    @Mock
    private InspectionService inspectionService;
    @Mock
    private InspectionMapper inspectionMapper;
    @InjectMocks
    private InspectionController inspectionController;

    @BeforeEach
    void setUp() { MockitoAnnotations.openMocks(this); }

    @Test
    void getAllInspections_returnsList() {
        Inspection domain = new Inspection();
        InspectionDTO dto = new InspectionDTO();
        when(inspectionService.getAllInspections()).thenReturn(Collections.singletonList(domain));
        when(inspectionMapper.toDTO(domain)).thenReturn(dto);
        List<InspectionDTO> result = inspectionController.getAllInspections();
        assertEquals(1, result.size());
    }

    @Test
    void getInspectionById_found() {
        Inspection domain = new Inspection();
        InspectionDTO dto = new InspectionDTO();
        when(inspectionService.getInspectionById(1L)).thenReturn(Optional.of(domain));
        when(inspectionMapper.toDTO(domain)).thenReturn(dto);
        ResponseEntity<InspectionDTO> response = inspectionController.getInspectionById(1L);
        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
    }

    @Test
    void getInspectionById_notFound() {
        when(inspectionService.getInspectionById(1L)).thenReturn(Optional.empty());
        ResponseEntity<InspectionDTO> response = inspectionController.getInspectionById(1L);
        assertEquals(404, response.getStatusCode().value());
    }

    @Test
    void createInspection_returnsCreated() {
        InspectionDTO dto = new InspectionDTO();
        Inspection domain = new Inspection();
        when(inspectionMapper.toDomain(dto)).thenReturn(domain);
        when(inspectionService.saveInspection(domain)).thenReturn(domain);
        when(inspectionMapper.toDTO(domain)).thenReturn(dto);
        InspectionDTO result = inspectionController.createInspection(dto);
        assertNotNull(result);
    }

    @Test
    void deleteInspection_returnsNoContent() {
        doNothing().when(inspectionService).deleteInspection(1L);
        ResponseEntity<Void> response = inspectionController.deleteInspection(1L);
        assertEquals(204, response.getStatusCode().value());
    }
}
