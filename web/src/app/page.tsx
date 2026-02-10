'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, ArrowRight, Check, X } from 'lucide-react'
import { useReadContract } from 'wagmi'
import { CONTRACTS, MEGA_NAMES_ABI } from '@/lib/contracts'
import { getTokenId, formatUSDM, getPrice, isValidName } from '@/lib/utils'
import Link from 'next/link'

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchedName, setSearchedName] = useState('')

  const tokenId = searchedName ? getTokenId(searchedName) : BigInt(0)

  const { data: records, isLoading } = useReadContract({
    address: CONTRACTS.testnet.megaNames,
    abi: MEGA_NAMES_ABI,
    functionName: 'records',
    args: [tokenId],
    query: {
      enabled: !!searchedName,
    },
  })

  const isAvailable = searchedName && records && records[0] === ''
  const isRegistered = searchedName && records && records[0] !== ''
  const price = searchedName ? getPrice(searchedName.length) : BigInt(0)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (isValidName(searchQuery)) {
      setSearchedName(searchQuery.toLowerCase())
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)]">
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-5xl lg:text-7xl font-bold mb-6">
              Your identity on{' '}
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                MegaETH
              </span>
            </h1>
            <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
              Register your .mega name and build your on-chain identity. 
              Human-readable addresses, websites, and more.
            </p>

            {/* Search Box */}
            <form onSubmit={handleSearch} className="max-w-xl mx-auto">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                  placeholder="Search for a name..."
                  className="w-full px-6 py-4 pr-32 rounded-2xl bg-gray-900 border border-gray-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-lg placeholder:text-gray-500"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <span className="text-gray-500">.mega</span>
                  <button
                    type="submit"
                    className="p-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 transition-colors"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </form>

            {/* Search Result */}
            {searchedName && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 max-w-xl mx-auto"
              >
                {isLoading ? (
                  <div className="p-6 rounded-2xl bg-gray-900 border border-gray-800">
                    <div className="animate-pulse flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gray-800" />
                      <div className="flex-1">
                        <div className="h-4 bg-gray-800 rounded w-1/3 mb-2" />
                        <div className="h-3 bg-gray-800 rounded w-1/4" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={`p-6 rounded-2xl border ${
                    isAvailable 
                      ? 'bg-green-500/10 border-green-500/30' 
                      : 'bg-red-500/10 border-red-500/30'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          isAvailable ? 'bg-green-500/20' : 'bg-red-500/20'
                        }`}>
                          {isAvailable ? (
                            <Check className="w-6 h-6 text-green-400" />
                          ) : (
                            <X className="w-6 h-6 text-red-400" />
                          )}
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-lg">{searchedName}.mega</p>
                          <p className={isAvailable ? 'text-green-400' : 'text-red-400'}>
                            {isAvailable ? 'Available' : 'Already registered'}
                          </p>
                        </div>
                      </div>
                      {isAvailable && (
                        <div className="text-right">
                          <p className="text-gray-400 text-sm">Price per year</p>
                          <p className="font-semibold text-lg">{formatUSDM(price)}</p>
                        </div>
                      )}
                    </div>
                    {isAvailable && (
                      <Link
                        href={`/register/${searchedName}`}
                        className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 transition-colors font-medium"
                      >
                        Register Now <ArrowRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              title: 'Human-Readable',
              description: 'Replace 0x addresses with memorable names like bread.mega',
              icon: '👤',
            },
            {
              title: 'Stable Pricing',
              description: 'Pay in USDM stablecoin. No ETH volatility.',
              icon: '💵',
            },
            {
              title: 'On-Chain Websites',
              description: 'Host your website directly on MegaETH with Warren.',
              icon: '🌐',
            },
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="p-6 rounded-2xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <h2 className="text-3xl font-bold text-center mb-12">Simple Pricing</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 max-w-4xl mx-auto">
          {[
            { length: '1 char', price: '$1,000' },
            { length: '2 char', price: '$500' },
            { length: '3 char', price: '$100' },
            { length: '4 char', price: '$10' },
            { length: '5+ char', price: '$1' },
          ].map((tier) => (
            <div
              key={tier.length}
              className="p-4 rounded-xl bg-gray-900 border border-gray-800 text-center"
            >
              <p className="text-gray-400 text-sm">{tier.length}</p>
              <p className="text-2xl font-bold">{tier.price}</p>
              <p className="text-gray-500 text-xs">per year</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
