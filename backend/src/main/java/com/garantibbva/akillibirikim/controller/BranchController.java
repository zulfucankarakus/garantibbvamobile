package com.garantibbva.akillibirikim.controller;

import com.garantibbva.akillibirikim.model.Branch;
import com.garantibbva.akillibirikim.service.BranchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/branches")
@RequiredArgsConstructor
public class BranchController {
    
    private final BranchService branchService;
    
    @GetMapping
    public ResponseEntity<List<Branch>> getAllBranches() {
        return ResponseEntity.ok(branchService.getAllBranches());
    }
    
    @GetMapping("/nearest")
    public ResponseEntity<List<Branch>> getNearestBranches(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(defaultValue = "5") int limit) {
        return ResponseEntity.ok(branchService.getNearestBranches(lat, lng, limit));
    }
    
    @GetMapping("/city/{city}")
    public ResponseEntity<List<Branch>> getBranchesByCity(@PathVariable String city) {
        return ResponseEntity.ok(branchService.getBranchesByCity(city));
    }
    
    @GetMapping("/search")
    public ResponseEntity<List<Branch>> searchBranches(@RequestParam String q) {
        return ResponseEntity.ok(branchService.searchBranches(q));
    }
}
