package com.garantibbva.akillibirikim.service;

import com.garantibbva.akillibirikim.model.Branch;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class BranchService {
    
    private final List<Branch> branches = initBranches();
    
    private List<Branch> initBranches() {
        List<Branch> list = new ArrayList<>();
        
        // İstanbul Şubeleri
        list.add(Branch.builder().id("1").name("Levent Şubesi").city("İstanbul").district("Beşiktaş")
                .address("Levent Mah. Büyükdere Cad. No:123").lat(41.0821).lng(29.0111)
                .phone("0212 123 4567").workingHours("09:00-17:00").build());
        
        list.add(Branch.builder().id("2").name("Kadıköy Şubesi").city("İstanbul").district("Kadıköy")
                .address("Caferaga Mah. Moda Cad. No:45").lat(40.9884).lng(29.0263)
                .phone("0216 234 5678").workingHours("09:00-17:00").build());
        
        list.add(Branch.builder().id("3").name("Taksim Şubesi").city("İstanbul").district("Beyoğlu")
                .address("İstiklal Cad. No:78").lat(41.0370).lng(28.9850)
                .phone("0212 345 6789").workingHours("09:00-17:00").build());
        
        list.add(Branch.builder().id("4").name("Ataşehir Şubesi").city("İstanbul").district("Ataşehir")
                .address("Barbaros Mah. Ataşehir Bulvarı No:56").lat(40.9923).lng(29.1244)
                .phone("0216 456 7890").workingHours("09:00-17:00").build());
        
        // Ankara Şubeleri
        list.add(Branch.builder().id("5").name("Kızılay Şubesi").city("Ankara").district("Çankaya")
                .address("Kızılay Mah. Atatürk Bulvarı No:100").lat(39.9208).lng(32.8541)
                .phone("0312 123 4567").workingHours("09:00-17:00").build());
        
        list.add(Branch.builder().id("6").name("Çankaya Şubesi").city("Ankara").district("Çankaya")
                .address("Kavaklıdere Mah. Tunalı Hilmi Cad. No:88").lat(39.9042).lng(32.8644)
                .phone("0312 234 5678").workingHours("09:00-17:00").build());
        
        // İzmir Şubeleri
        list.add(Branch.builder().id("7").name("Alsancak Şubesi").city("İzmir").district("Konak")
                .address("Alsancak Mah. Kıbrıs Şehitleri Cad. No:55").lat(38.4361).lng(27.1422)
                .phone("0232 123 4567").workingHours("09:00-17:00").build());
        
        list.add(Branch.builder().id("8").name("Karşıyaka Şubesi").city("İzmir").district("Karşıyaka")
                .address("Çarşı Mah. Cemal Gürsel Cad. No:33").lat(38.4553).lng(27.1094)
                .phone("0232 234 5678").workingHours("09:00-17:00").build());
        
        // Antalya
        list.add(Branch.builder().id("9").name("Konyaaltı Şubesi").city("Antalya").district("Konyaaltı")
                .address("Liman Mah. Atatürk Bulvarı No:200").lat(36.8679).lng(30.6389)
                .phone("0242 123 4567").workingHours("09:00-17:00").build());
        
        // Bursa
        list.add(Branch.builder().id("10").name("Nilüfer Şubesi").city("Bursa").district("Nilüfer")
                .address("Fethiye Mah. Nilüfer Cad. No:77").lat(40.2157).lng(28.9252)
                .phone("0224 123 4567").workingHours("09:00-17:00").build());
        
        return list;
    }
    
    public List<Branch> getAllBranches() {
        return branches;
    }
    
    public List<Branch> getNearestBranches(double lat, double lng, int limit) {
        return branches.stream()
                .sorted(Comparator.comparingDouble(b -> calculateDistance(lat, lng, b.getLat(), b.getLng())))
                .limit(limit)
                .collect(Collectors.toList());
    }
    
    public List<Branch> getBranchesByCity(String city) {
        return branches.stream()
                .filter(b -> b.getCity().equalsIgnoreCase(city))
                .collect(Collectors.toList());
    }
    
    public List<Branch> searchBranches(String query) {
        String q = query.toLowerCase();
        return branches.stream()
                .filter(b -> b.getName().toLowerCase().contains(q) ||
                            b.getCity().toLowerCase().contains(q) ||
                            b.getDistrict().toLowerCase().contains(q))
                .collect(Collectors.toList());
    }
    
    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371; // Earth radius in km
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                   Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                   Math.sin(dLon/2) * Math.sin(dLon/2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
}
