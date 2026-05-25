package com.hsqe.hsqe_assistant_backend.services;

import com.hsqe.hsqe_assistant_backend.domain.Certificate;
import com.hsqe.hsqe_assistant_backend.entities.CertificateEntity;
import com.hsqe.hsqe_assistant_backend.mappers.CertificateMapper;
import com.hsqe.hsqe_assistant_backend.repositories.CertificateRepository;
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

class CertificateServiceTest {
    @Mock
    private CertificateRepository certificateRepository;
    @Mock
    private CertificateMapper certificateMapper;
    @InjectMocks
    private CertificateService certificateService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void getAllCertificates_returnsList() {
        CertificateEntity entity = new CertificateEntity();
        Certificate domain = new Certificate();
        when(certificateRepository.findAll()).thenReturn(Collections.singletonList(entity));
        when(certificateMapper.toDomainEntity(entity)).thenReturn(domain);
        List<Certificate> result = certificateService.getAllCertificates();
        assertEquals(1, result.size());
    }

    @Test
    void getCertificateById_returnsCertificate() {
        CertificateEntity entity = new CertificateEntity();
        Certificate domain = new Certificate();
        when(certificateRepository.findById(1L)).thenReturn(Optional.of(entity));
        when(certificateMapper.toDomainEntity(entity)).thenReturn(domain);
        Optional<Certificate> result = certificateService.getCertificateById(1L);
        assertTrue(result.isPresent());
    }

    @Test
    void saveCertificate_savesAndReturnsCertificate() {
        Certificate domain = new Certificate();
        CertificateEntity entity = new CertificateEntity();
        when(certificateMapper.toEntity(domain)).thenReturn(entity);
        when(certificateRepository.save(entity)).thenReturn(entity);
        when(certificateMapper.toDomainEntity(entity)).thenReturn(domain);
        Certificate result = certificateService.saveCertificate(domain);
        assertNotNull(result);
    }

    @Test
    void deleteCertificate_deletesById() {
        doNothing().when(certificateRepository).deleteById(1L);
        certificateService.deleteCertificate(1L);
        verify(certificateRepository, times(1)).deleteById(1L);
    }
}
