package com.hsqe.hsqe_assistant_backend.controllers;

import com.hsqe.hsqe_assistant_backend.dto.CertificateDTO;
import com.hsqe.hsqe_assistant_backend.domain.Certificate;
import com.hsqe.hsqe_assistant_backend.mappers.CertificateMapper;
import com.hsqe.hsqe_assistant_backend.services.CertificateService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/certificates")
public class CertificateController {
    private static final Logger log = LoggerFactory.getLogger(CertificateController.class);
    private final CertificateService certificateService;
    private final CertificateMapper certificateMapper;

    public CertificateController(CertificateService certificateService, CertificateMapper certificateMapper) {
        this.certificateService = certificateService;
        this.certificateMapper = certificateMapper;
    }

    @GetMapping
    public List<CertificateDTO> getAllCertificates() {
        log.info("API call: getAllCertificates");
        return certificateService.getAllCertificates().stream()
                .map(certificateMapper::toDTO)
                .toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<CertificateDTO> getCertificateById(@PathVariable Long id) {
        return certificateService.getCertificateById(id)
                .map(certificateMapper::toDTO)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public CertificateDTO createCertificate(@RequestBody CertificateDTO certificateDTO) {
        log.debug("API call: createCertificate with data: {}", certificateDTO);
        Certificate saved = certificateService.saveCertificate(certificateMapper.toDomain(certificateDTO));
        return certificateMapper.toDTO(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<CertificateDTO> updateCertificate(@PathVariable Long id,
                                                            @RequestBody CertificateDTO certificateDTO) {
        log.debug("API call: updateCertificate id={} data={}", id, certificateDTO);
        return certificateService.getCertificateById(id)
                .map(existing -> {
                    certificateDTO.setId(id);
                    Certificate saved = certificateService.saveCertificate(certificateMapper.toDomain(certificateDTO));
                    return ResponseEntity.ok(certificateMapper.toDTO(saved));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCertificate(@PathVariable Long id) {
        log.warn("API call: deleteCertificate with id: {}", id);
        certificateService.deleteCertificate(id);
        return ResponseEntity.noContent().build();
    }
}
