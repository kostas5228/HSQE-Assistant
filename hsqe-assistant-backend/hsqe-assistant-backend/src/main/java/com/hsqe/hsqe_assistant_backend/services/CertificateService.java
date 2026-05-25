package com.hsqe.hsqe_assistant_backend.services;

import com.hsqe.hsqe_assistant_backend.domain.Certificate;
import com.hsqe.hsqe_assistant_backend.entities.CertificateEntity;
import com.hsqe.hsqe_assistant_backend.mappers.CertificateMapper;
import com.hsqe.hsqe_assistant_backend.repositories.CertificateRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class CertificateService {
    private final CertificateRepository certificateRepository;
    private final CertificateMapper certificateMapper;
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(CertificateService.class);

    public CertificateService(CertificateRepository certificateRepository, CertificateMapper certificateMapper) {
        this.certificateRepository = certificateRepository;
        this.certificateMapper = certificateMapper;
    }

    public List<Certificate> getAllCertificates() {
        log.info("Fetching all certificates");
        return certificateRepository.findAll().stream()
                .map(certificateMapper::toDomainEntity)
                .toList();
    }

    public Optional<Certificate> getCertificateById(Long id) {
        return certificateRepository.findById(id).map(certificateMapper::toDomainEntity);
    }

    @Transactional
    public Certificate saveCertificate(Certificate certificate) {
        log.debug("Saving certificate: {}", certificate);
        CertificateEntity entity = certificateMapper.toEntity(certificate);
        CertificateEntity saved = certificateRepository.save(entity);
        return certificateMapper.toDomainEntity(saved);
    }

    @Transactional
    public void deleteCertificate(Long id) {
        log.warn("Deleting certificate with id: {}", id);
        certificateRepository.deleteById(id);
    }
}
