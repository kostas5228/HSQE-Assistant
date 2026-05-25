package com.hsqe.hsqe_assistant_backend.controllers;

import com.hsqe.hsqe_assistant_backend.domain.Certificate;
import com.hsqe.hsqe_assistant_backend.dto.CertificateDTO;
import com.hsqe.hsqe_assistant_backend.mappers.CertificateMapper;
import com.hsqe.hsqe_assistant_backend.services.CertificateService;
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

class CertificateControllerTest {
    @Mock
    private CertificateService certificateService;
    @Mock
    private CertificateMapper certificateMapper;
    @InjectMocks
    private CertificateController certificateController;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void getAllCertificates_returnsList() {
        Certificate domain = new Certificate();
        CertificateDTO dto = new CertificateDTO();
        when(certificateService.getAllCertificates()).thenReturn(Collections.singletonList(domain));
        when(certificateMapper.toDTO(domain)).thenReturn(dto);
        List<CertificateDTO> result = certificateController.getAllCertificates();
        assertEquals(1, result.size());
    }

    @Test
    void getCertificateById_found() {
        Certificate domain = new Certificate();
        CertificateDTO dto = new CertificateDTO();
        when(certificateService.getCertificateById(1L)).thenReturn(Optional.of(domain));
        when(certificateMapper.toDTO(domain)).thenReturn(dto);
        ResponseEntity<CertificateDTO> response = certificateController.getCertificateById(1L);
        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
    }

    @Test
    void getCertificateById_notFound() {
        when(certificateService.getCertificateById(1L)).thenReturn(Optional.empty());
        ResponseEntity<CertificateDTO> response = certificateController.getCertificateById(1L);
        assertEquals(404, response.getStatusCode().value());
    }

    @Test
    void createCertificate_returnsCreated() {
        CertificateDTO dto = new CertificateDTO();
        Certificate domain = new Certificate();
        when(certificateMapper.toDomain(dto)).thenReturn(domain);
        when(certificateService.saveCertificate(domain)).thenReturn(domain);
        when(certificateMapper.toDTO(domain)).thenReturn(dto);
        CertificateDTO result = certificateController.createCertificate(dto);
        assertNotNull(result);
    }

    @Test
    void deleteCertificate_returnsNoContent() {
        doNothing().when(certificateService).deleteCertificate(1L);
        ResponseEntity<Void> response = certificateController.deleteCertificate(1L);
        assertEquals(204, response.getStatusCode().value());
    }
}
