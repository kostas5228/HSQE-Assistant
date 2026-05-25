package com.hsqe.hsqe_assistant_backend.controllers;

import com.hsqe.hsqe_assistant_backend.domain.InspectionReport;
import com.hsqe.hsqe_assistant_backend.dto.InspectionReportDTO;
import com.hsqe.hsqe_assistant_backend.mappers.InspectionReportMapper;
import com.hsqe.hsqe_assistant_backend.services.InspectionReportService;
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

class InspectionReportControllerTest {
    @Mock
    private InspectionReportService inspectionReportService;
    @Mock
    private InspectionReportMapper inspectionReportMapper;
    @InjectMocks
    private InspectionReportController inspectionReportController;

    @BeforeEach
    void setUp() { MockitoAnnotations.openMocks(this); }

    @Test
    void getAllInspectionReports_returnsList() {
        InspectionReport domain = new InspectionReport();
        InspectionReportDTO dto = new InspectionReportDTO();
        when(inspectionReportService.getAllInspectionReports()).thenReturn(Collections.singletonList(domain));
        when(inspectionReportMapper.toDTO(domain)).thenReturn(dto);
        List<InspectionReportDTO> result = inspectionReportController.getAllInspectionReports();
        assertEquals(1, result.size());
    }

    @Test
    void getInspectionReportById_found() {
        InspectionReport domain = new InspectionReport();
        InspectionReportDTO dto = new InspectionReportDTO();
        when(inspectionReportService.getInspectionReportById(1L)).thenReturn(Optional.of(domain));
        when(inspectionReportMapper.toDTO(domain)).thenReturn(dto);
        ResponseEntity<InspectionReportDTO> response = inspectionReportController.getInspectionReportById(1L);
        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
    }

    @Test
    void getInspectionReportById_notFound() {
        when(inspectionReportService.getInspectionReportById(1L)).thenReturn(Optional.empty());
        ResponseEntity<InspectionReportDTO> response = inspectionReportController.getInspectionReportById(1L);
        assertEquals(404, response.getStatusCode().value());
    }

    @Test
    void createInspectionReport_returnsCreated() {
        InspectionReportDTO dto = new InspectionReportDTO();
        InspectionReport domain = new InspectionReport();
        when(inspectionReportMapper.toDomain(dto)).thenReturn(domain);
        when(inspectionReportService.saveInspectionReport(domain)).thenReturn(domain);
        when(inspectionReportMapper.toDTO(domain)).thenReturn(dto);
        InspectionReportDTO result = inspectionReportController.createInspectionReport(dto);
        assertNotNull(result);
    }

    @Test
    void deleteInspectionReport_returnsNoContent() {
        doNothing().when(inspectionReportService).deleteInspectionReport(1L);
        ResponseEntity<Void> response = inspectionReportController.deleteInspectionReport(1L);
        assertEquals(204, response.getStatusCode().value());
    }
}
