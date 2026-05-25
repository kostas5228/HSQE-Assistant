package com.hsqe.hsqe_assistant_backend.services;

import com.hsqe.hsqe_assistant_backend.domain.InspectionReport;
import com.hsqe.hsqe_assistant_backend.entities.InspectionReportEntity;
import com.hsqe.hsqe_assistant_backend.mappers.InspectionReportMapper;
import com.hsqe.hsqe_assistant_backend.repositories.InspectionReportRepository;
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

class InspectionReportServiceTest {
    @Mock
    private InspectionReportRepository inspectionReportRepository;
    @Mock
    private InspectionReportMapper inspectionReportMapper;
    @InjectMocks
    private InspectionReportService inspectionReportService;

    @BeforeEach
    void setUp() { MockitoAnnotations.openMocks(this); }

    @Test
    void getAllInspectionReports_returnsList() {
        InspectionReportEntity entity = new InspectionReportEntity();
        InspectionReport domain = new InspectionReport();
        when(inspectionReportRepository.findAll()).thenReturn(Collections.singletonList(entity));
        when(inspectionReportMapper.toDomainEntity(entity)).thenReturn(domain);
        List<InspectionReport> result = inspectionReportService.getAllInspectionReports();
        assertEquals(1, result.size());
    }

    @Test
    void getInspectionReportById_returnsInspectionReport() {
        InspectionReportEntity entity = new InspectionReportEntity();
        InspectionReport domain = new InspectionReport();
        when(inspectionReportRepository.findById(1L)).thenReturn(Optional.of(entity));
        when(inspectionReportMapper.toDomainEntity(entity)).thenReturn(domain);
        Optional<InspectionReport> result = inspectionReportService.getInspectionReportById(1L);
        assertTrue(result.isPresent());
    }

    @Test
    void saveInspectionReport_savesAndReturnsInspectionReport() {
        InspectionReport domain = new InspectionReport();
        InspectionReportEntity entity = new InspectionReportEntity();
        when(inspectionReportMapper.toEntity(domain)).thenReturn(entity);
        when(inspectionReportRepository.save(entity)).thenReturn(entity);
        when(inspectionReportMapper.toDomainEntity(entity)).thenReturn(domain);
        InspectionReport result = inspectionReportService.saveInspectionReport(domain);
        assertNotNull(result);
    }

    @Test
    void deleteInspectionReport_deletesById() {
        doNothing().when(inspectionReportRepository).deleteById(1L);
        inspectionReportService.deleteInspectionReport(1L);
        verify(inspectionReportRepository, times(1)).deleteById(1L);
    }

    @Test
    void saveInspectionReport_throwsException_whenInspectorNamePresentForPSC() {
        InspectionReport report = new InspectionReport();
        report.setTypeOfInspection("PSC");
        report.setPscAuthority("IMO");
        report.setInspectorName("John Doe");
        Exception ex = assertThrows(IllegalArgumentException.class, () -> inspectionReportService.saveInspectionReport(report));
        assertTrue(ex.getMessage().contains("inspectorName must be null"));
    }

    @Test
    void saveInspectionReport_succeeds_whenInspectorNameOptionalForFlagOrVetting() {
        InspectionReport report = new InspectionReport();
        report.setTypeOfInspection("Flag");
        report.setFlagState("Greece");
        report.setInspectorName("John Doe");
        InspectionReportEntity entity = new InspectionReportEntity();
        when(inspectionReportMapper.toEntity(report)).thenReturn(entity);
        when(inspectionReportRepository.save(entity)).thenReturn(entity);
        when(inspectionReportMapper.toDomainEntity(entity)).thenReturn(report);
        InspectionReport result = inspectionReportService.saveInspectionReport(report);
        assertNotNull(result);

        report.setTypeOfInspection("Vetting");
        report.setValidity(12);
        report.setInspectorName("Jane Smith");
        when(inspectionReportMapper.toEntity(report)).thenReturn(entity);
        when(inspectionReportRepository.save(entity)).thenReturn(entity);
        when(inspectionReportMapper.toDomainEntity(entity)).thenReturn(report);
        result = inspectionReportService.saveInspectionReport(report);
        assertNotNull(result);
    }
}
